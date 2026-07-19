import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import { cancelWorkflowRun } from "@/lib/github";
import { normalizePorts } from "@/lib/ports";
import { normalizeCommands, normalizeRunMode, composeRunCommand } from "@/lib/runCommand";
import { normalizeAfterScript, composeAfterScript } from "@/lib/afterScript";
import { encrypt } from "@/lib/crypto";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await dbConnect();

  const project = await Project.findOne({ _id: id, userId }).select("-pat").lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (project.cfWorkersKey) {
    project.cfWorkersKey = "********";
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await dbConnect();

  const project = await Project.findOne({ _id: id, userId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = await request.json();
  const allowedUpdates = ["name", "branch", "cfWorkersKey", "cfKvNamespaceId", "envVars", "portMappings"];
  for (const key of allowedUpdates) {
    if (key in body) {
      if (key === "cfWorkersKey") {
        if (body[key] !== "********") {
          project.cfWorkersKey = body[key] ? encrypt(body[key]) : null;
        }
      } else {
        (project as any)[key] = body[key];
      }
    }
  }

  // Ports (1–5): keep `port` as the primary for backward compatibility.
  if ("ports" in body || "port" in body) {
    const ports = normalizePorts(body.ports, body.port);
    project.ports = ports;
    project.port = ports[0];
  }

  // Run commands (1–5) + mode: recompose the effective runCommand.
  if ("runCommands" in body || "runMode" in body || "runCommand" in body) {
    const runCommands = normalizeCommands(body.runCommands, body.runCommand);
    const runMode = normalizeRunMode(body.runMode ?? project.runMode);
    project.runCommands = runCommands;
    project.runMode = runMode;
    project.runCommand = composeRunCommand(runCommands, runMode);
  }

  // After-scripts: recompose the stored script string per phase.
  if ("afterStart" in body) {
    const afterStart = normalizeAfterScript(body.afterStart);
    project.afterStart = afterStart;
    project.afterStartScript = composeAfterScript(afterStart);
  }
  if ("afterStop" in body) {
    const afterStop = normalizeAfterScript(body.afterStop);
    project.afterStop = afterStop;
    project.afterStopScript = composeAfterScript(afterStop);
  }

  await project.save();

  // Never return the stored PAT to the client.
  const safe = project.toObject();
  delete (safe as any).pat;
  if (safe.cfWorkersKey) {
    safe.cfWorkersKey = "********";
  }
  return NextResponse.json({ project: safe });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await dbConnect();

  const project = await Project.findOne({ _id: id, userId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (project.activeWorkflowRunId) {
    await cancelWorkflowRun(project.activeWorkflowRunId).catch(() => {});
  }

  await Project.findByIdAndDelete(id);
  return NextResponse.json({ message: "Project deleted" });
}
