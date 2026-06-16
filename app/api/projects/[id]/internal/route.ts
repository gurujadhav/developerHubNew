import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/lib/models/Project";

type RouteParams = { params: { id: string } };

/**
 * Internal endpoint used by the master workflow cron job.
 * Returns the full project including PAT and env vars (needed to re-trigger workflows).
 * Authenticated by x-internal-secret header only — never expose to browser.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const project = await Project.findById(params.id).lean();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}
