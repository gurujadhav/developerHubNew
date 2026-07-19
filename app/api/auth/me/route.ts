import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { encrypt } from "@/lib/crypto";

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

  const userObj = user.toObject();
  if (userObj.cfWorkersKey) {
    userObj.cfWorkersKey = "********";
  }

  return NextResponse.json({ user: userObj });
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cfWorkersKey, cfAccountId } = await request.json();

  await dbConnect();

  const updateData: any = { cfAccountId: cfAccountId ?? null };
  if (cfWorkersKey !== "********") {
    updateData.cfWorkersKey = cfWorkersKey ? encrypt(cfWorkersKey) : null;
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (cfWorkersKey !== "********") {
    user.cfWorkersKey = cfWorkersKey ? encrypt(cfWorkersKey) : null;
  }
  user.cfAccountId = cfAccountId ?? null;
  await user.save();

  const userObj = user.toObject();
  delete (userObj as any).password;
  if (userObj.cfWorkersKey) {
    userObj.cfWorkersKey = "********";
  }

  return NextResponse.json({ user: userObj });
}
