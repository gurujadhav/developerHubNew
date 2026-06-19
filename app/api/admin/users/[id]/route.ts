import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { requireSuperAdmin } from "@/lib/admin";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/:id - update a user's access, quota, or role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await requireSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await dbConnect();
  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();

  if (typeof body.canDeploy === "boolean") target.canDeploy = body.canDeploy;

  if (typeof body.maxProjects === "number" && body.maxProjects >= 0) {
    target.maxProjects = Math.floor(body.maxProjects);
  }

  if (body.role === "user" || body.role === "superadmin") {
    // Prevent a super-admin from demoting themselves (avoids locking out admin).
    if (String(target._id) === String(admin._id) && body.role !== "superadmin") {
      return NextResponse.json(
        { error: "You cannot remove your own super-admin role" },
        { status: 400 }
      );
    }
    target.role = body.role;
  }

  await target.save();

  return NextResponse.json({
    user: {
      id: String(target._id),
      role: target.role,
      canDeploy: target.canDeploy,
      maxProjects: target.maxProjects,
    },
  });
}