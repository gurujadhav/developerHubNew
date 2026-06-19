import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import User, { IUser } from "@/lib/models/User";

/** Emails listed in SUPER_ADMIN_EMAILS are bootstrapped as super-admins. */
export function isSuperAdminEmail(email?: string | null): boolean {
  const list = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

/**
 * Resolve the requesting user and return them only if they are a super-admin.
 * Self-heals the DB role when the email is in SUPER_ADMIN_EMAILS but the stored
 * role hasn't caught up yet (e.g. account created before the env was set).
 */
export async function requireSuperAdmin(request: NextRequest): Promise<IUser | null> {
  const userId = request.headers.get("x-user-id");
  if (!userId) return null;

  await dbConnect();
  const user = await User.findById(userId);
  if (!user) return null;

  if (user.role !== "superadmin" && isSuperAdminEmail(user.email)) {
    user.role = "superadmin";
    await user.save();
  }

  return user.role === "superadmin" ? user : null;
}