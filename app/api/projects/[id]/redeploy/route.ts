import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import User from "@/lib/models/User";
import { triggerDeployWorkflow, envVarsToBase64, cancelWorkflowRun } from "@/lib/github";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/projects/:id/redeploy - re-trigger deployment using stored config
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await dbConnect();

  // Full document (includes pat + envVars) — needed to re-trigger the workflow.
  const project = await Project.findOne({ _id: id, userId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Cancel any currently active run before starting a fresh one.
  if (project.activeWorkflowRunId) {
    await cancelWorkflowRun(project.activeWorkflowRunId).catch(() => {});
  }

  const user = await User.findById(userId).select("cfWorkersKey");
  const envB64 = envVarsToBase64(project.envVars ?? []);
  const effectiveCfKey = project.cfWorkersKey || user?.cfWorkersKey || "";

  // Mark as deploying and clear the previous failure before triggering.
  project.status = "deploying";
  project.failureReason = null;
  await project.save();

  try {
    await triggerDeployWorkflow({
      projectId: project._id.toString(),
      repoUrl: project.repoUrl,
      pat: project.pat || "",
      envB64,
      runCommand: project.runCommand,
      port: project.port,
      cfWorkersKey: effectiveCfKey,
    });
  } catch (ghError) {
    console.error("Failed to re-trigger GitHub workflow:", ghError);
    project.status = "failed";
    project.failureReason = "Failed to trigger redeployment workflow";
    await project.save();
    return NextResponse.json(
      { error: "Failed to trigger redeployment. Check GitHub Actions configuration." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    project: { id: project._id.toString(), status: project.status },
  });
}
