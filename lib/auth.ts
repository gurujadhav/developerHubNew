import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<JwtPayload | null> {
  const token =
    request.cookies.get("auth_token")?.value ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return verifyToken(token);
}

export const COOKIE_NAME = "auth_token";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};
