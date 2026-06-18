import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import { cancelWorkflowRun } from "@/lib/github";

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { project_id, tunnel_url, status, workflow_number, run_id } = body;

    if (!project_id || !status) {
      return NextResponse.json({ error: "project_id and status are required" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.findById(project_id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const incomingRunId = run_id ? String(run_id) : null;
    const currentRunId = project.activeWorkflowRunId ?? null;

    if (status === "running") {
      // A server reports it is live. If a *different* run was previously active
      // (i.e. this is a rotation taking over), cancel the old run now — this is
      // the make-before-break cutover, done the instant the new server is up.
      if (currentRunId && incomingRunId && currentRunId !== incomingRunId) {
        await cancelWorkflowRun(currentRunId).catch(() => {});
      }

      project.status = "running";
      if (workflow_number) project.activeWorkflow = Number(workflow_number);
      if (incomingRunId) project.activeWorkflowRunId = incomingRunId;

      // Multi-port: prefer the `tunnels` array; fall back to a single tunnel_url.
      const tunnels = Array.isArray(body.tunnels) ? body.tunnels : null;
      if (tunnels && tunnels.length) {
        project.outputLinks = tunnels
          .filter((t: { url?: string }) => t && t.url)
          .map((t: { port?: number; url: string }) => ({
            port: Number(t.port),
            url: String(t.url),
          }));
        project.outputLink = project.outputLinks[0]?.url ?? null;
      } else if (tunnel_url) {
        project.outputLink = tunnel_url;
        project.outputLinks = [
          { port: project.ports?.[0] ?? project.port, url: tunnel_url },
        ];
      }

      project.deployedAt = new Date();
      project.failureReason = null;
    } else {
      // stopped / failed. Ignore notifications coming from a run that is no
      // longer the active one (e.g. the old server we just rotated away from),
      // so a stale callback can't clobber the freshly-promoted server.
      const isCurrentRun =
        !currentRunId || !incomingRunId || currentRunId === incomingRunId;

      if (!isCurrentRun) {
        console.log(
          `[webhook] Ignoring stale '${status}' for ${project_id} from run ${incomingRunId} (active run is ${currentRunId})`
        );
        return NextResponse.json({ ok: true, ignored: true });
      }

      project.status = status;
      if (status === "failed") {
        project.failureReason = body.failure_reason ?? "Workflow failed";
        project.outputLink = null;
        project.outputLinks = [];
      }
      // For "stopped" we deliberately leave outputLink(s) as-is.
    }

    await project.save();

    console.log(
      `[webhook] Project ${project_id} → status=${status}, workflow=${workflow_number}, run=${incomingRunId}, tunnel=${tunnel_url}`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}