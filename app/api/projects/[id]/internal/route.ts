import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await dbConnect();

  const project = await Project.findById(id).lean();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({ project });
}
