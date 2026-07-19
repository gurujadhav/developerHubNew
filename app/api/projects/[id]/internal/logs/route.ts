import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { logs } = await request.json();

  await dbConnect();
  const project = await Project.findById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Update project logs
  project.logs = logs || "";
  await project.save();

  // Check if user is currently live (requested logs within the last 8 seconds)
  const userLive = project.logsUserLiveAt
    ? (Date.now() - new Date(project.logsUserLiveAt).getTime() < 8000)
    : false;

  return NextResponse.json({ userLive });
}
