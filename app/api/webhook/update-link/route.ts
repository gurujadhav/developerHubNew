import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";

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

    const update: Record<string, unknown> = {
      status,
      activeWorkflow: workflow_number ? Number(workflow_number) : undefined,
      activeWorkflowRunId: run_id ?? undefined,
    };

    if (tunnel_url) {
      update.outputLink = tunnel_url;
    }

    if (status === "running") {
      update.deployedAt = new Date();
      update.failureReason = null;
    }

    if (status === "failed") {
      update.failureReason = body.failure_reason ?? "Workflow failed";
      update.outputLink = null;
    }

    if (status === "stopped") {
      // Don't reset outputLink on stop — cron will update it
    }

    // Remove undefined keys
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const project = await Project.findByIdAndUpdate(
      project_id,
      { $set: update },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log(`[webhook] Project ${project_id} → status=${status}, workflow=${workflow_number}, tunnel=${tunnel_url}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
