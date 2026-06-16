import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import { cancelWorkflowRun } from "@/lib/github";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await dbConnect();

  const project = await Project.findOne({ _id: id, userId }).select("-pat").lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

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
  const allowedUpdates = ["name", "runCommand", "port", "cfWorkersKey", "cfKvNamespaceId", "envVars"];
  for (const key of allowedUpdates) {
    if (key in body) (project as any)[key] = body[key];
  }
  await project.save();

  return NextResponse.json({ project });
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
