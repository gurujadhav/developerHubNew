import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import Project from "@/lib/models/Project";
import { requireSuperAdmin } from "@/lib/admin";

// GET /api/admin/users - list all users with their access, quota, and project count
export async function GET(request: NextRequest) {
  const admin = await requireSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();

  const users = await User.find().select("-password -cfWorkersKey").sort({ createdAt: -1 }).lean();

  const counts = await Project.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

  const result = users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role ?? "user",
    canDeploy: u.canDeploy ?? true,
    maxProjects: u.maxProjects ?? 0,
    projectCount: countMap.get(String(u._id)) ?? 0,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ users: result });
}