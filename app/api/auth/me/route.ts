import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(userId).select("-password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cfWorkersKey, cfAccountId } = await request.json();

  await dbConnect();
  const user = await User.findByIdAndUpdate(
    userId,
    { cfWorkersKey: cfWorkersKey ?? null, cfAccountId: cfAccountId ?? null },
    { new: true }
  ).select("-password");

  return NextResponse.json({ user });
}
