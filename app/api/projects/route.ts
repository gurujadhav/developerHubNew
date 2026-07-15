import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import User from "@/lib/models/User";
import { triggerDeployWorkflow, envVarsToBase64, checkRepoAccess } from "@/lib/github";
import { normalizePorts } from "@/lib/ports";
import { normalizeCommands, normalizeRunMode, composeRunCommand } from "@/lib/runCommand";
import { normalizeAfterScript, composeAfterScript } from "@/lib/afterScript";

// GET /api/projects - list user's projects
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  // Allow master workflow to fetch all running projects via secret header
  const isInternalRequest =
    request.headers.get("x-internal-secret") === process.env.WEBHOOK_SECRET;

  await dbConnect();

  if (isInternalRequest) {
    // Return all running projects for the cron maintenance job
    const projects = await Project.find({ status: { $in: ["running", "deploying"] } })
      .select("-pat -envVars")
      .lean();
    return NextResponse.json({ projects });
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await Project.find({ userId })
    .select("-pat -envVars")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ projects });
}

// POST /api/projects - create a new project and kick off deployment
export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, repoUrl, pat, branch, envVars, runCommand, port, cfWorkersKey, cfKvNamespaceId, projectType } = body;

    // Trim the PAT — a stray trailing newline (common when pasting tokens)
    // corrupts the git clone URL and downstream auth headers.
    const cleanPat = (pat ?? "").trim();

    // Up to 5 ports; `ports` (array/csv) preferred, legacy `port` as fallback.
    const ports = normalizePorts(body.ports, port);

    // Up to 5 run commands, combined per runMode into the command sent to the runner.
    const runCommands = normalizeCommands(body.runCommands, runCommand);
    const runMode = normalizeRunMode(body.runMode);
    const composedCommand = composeRunCommand(runCommands, runMode);

    // After-scripts (post-start + teardown), each: inline commands + optional repo file.
    const afterStart = normalizeAfterScript(body.afterStart);
    const afterStop = normalizeAfterScript(body.afterStop);
    const afterStartScript = composeAfterScript(afterStart);
    const afterStopScript = composeAfterScript(afterStop);

    // Validate projectType
    const validProjectTypes = ["express", "python"];
    const finalProjectType = validProjectTypes.includes(projectType) ? projectType : "express";

    if (!name || !repoUrl) {
      return NextResponse.json(
        { error: "name and repoUrl are required" },
        { status: 400 }
      );
    }

    // A PAT is only needed for private repos. If none was provided, confirm the
    // repo is publicly cloneable before kicking off a deployment that would fail.
    if (!cleanPat) {
      const access = await checkRepoAccess(repoUrl);
      if (!access.accessible || access.isPrivate) {
        return NextResponse.json(
          { error: "This repository is private or not found. A GitHub PAT is required." },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    // Get user's CF key + access settings
    const user = await User.findById(userId).select(
      "cfWorkersKey cfAccountId role canDeploy maxProjects"
    );
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = user.role === "superadmin";

    // Access gate: the account must be allowed to host projects.
    if (!isAdmin && !user.canDeploy) {
      return NextResponse.json(
        { error: "Your account isn't approved to host projects yet. Contact an administrator." },
        { status: 403 }
      );
    }

    // Quota gate: enforce the per-user project limit (super-admins are unlimited).
    if (!isAdmin) {
      const existingCount = await Project.countDocuments({ userId });
      if (existingCount >= user.maxProjects) {
        return NextResponse.json(
          {
            error: `Project limit reached (${user.maxProjects}). Delete a project or ask an administrator to raise your limit.`,
          },
          { status: 403 }
        );
      }
    }

    const project = await Project.create({
      userId,
      name: name.trim(),
      repoUrl: repoUrl.trim(),
      pat: cleanPat,
      branch: (branch || "main").trim(),
      projectType: finalProjectType,
      envVars: envVars ?? [],
      runCommand: composedCommand,
      runCommands,
      runMode,
      afterStart,
      afterStartScript,
      afterStop,
      afterStopScript,
      port: ports[0],
      ports,
      cfWorkersKey: cfWorkersKey || null,
      cfKvNamespaceId: cfKvNamespaceId || null,
      status: "deploying",
    });

    // Trigger master workflow to deploy
    const envB64 = envVarsToBase64(envVars ?? []);
    const effectiveCfKey = cfWorkersKey || user?.cfWorkersKey || "";

    try {
      await triggerDeployWorkflow({
        projectId: project._id.toString(),
        repoUrl,
        pat: cleanPat,
        branch: project.branch,
        envB64,
        runCommand: composedCommand,
        ports,
        cfWorkersKey: effectiveCfKey,
        afterStart: afterStartScript,
        afterStop: afterStopScript,
        projectType: finalProjectType,
      });
    } catch (ghError) {
      console.error("Failed to trigger deployment workflow:", ghError);
      await Project.findByIdAndUpdate(project._id, {
        status: "failed",
        failureReason: "Failed to trigger deployment",
      });
      return NextResponse.json(
        { error: "Failed to trigger deployment. Check the deployment system configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        project: {
          id: project._id.toString(),
          name: project.name,
          repoUrl: project.repoUrl,
          projectType: project.projectType,
          status: project.status,
          runCommand: project.runCommand,
          port: project.port,
          createdAt: project.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
