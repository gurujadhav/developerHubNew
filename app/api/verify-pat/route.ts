import { NextRequest, NextResponse } from "next/server";
import { checkRepoAccess, parseRepoUrl } from "@/lib/github";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pat, repoUrl } = await request.json();

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    if (!parseRepoUrl(repoUrl)) {
      return NextResponse.json(
        { valid: false, error: "Invalid GitHub repository URL format" },
        { status: 200 }
      );
    }

    // 1. Try unauthenticated access first — if it works, the repo is public and
    //    no PAT is required to clone it.
    const publicAccess = await checkRepoAccess(repoUrl);
    if (publicAccess.accessible && !publicAccess.isPrivate) {
      return NextResponse.json({
        valid: true,
        repoPublic: true,
        repoPrivate: false,
        repoName: publicAccess.fullName,
      });
    }

    // 2. Repo is private or not publicly reachable — a PAT is required.
    if (!pat) {
      return NextResponse.json({
        valid: false,
        needsPat: true,
        error: "This repository is private or not found. Provide a PAT with repo scope.",
      });
    }

    // 3. Verify the PAT itself authenticates.
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        valid: false,
        needsPat: true,
        error: "Invalid GitHub PAT — authentication failed",
      });
    }

    const ghUser = await userResponse.json();

    // 4. Confirm the PAT can reach this specific repo.
    const patAccess = await checkRepoAccess(repoUrl, pat);
    if (!patAccess.accessible) {
      return NextResponse.json({
        valid: false,
        needsPat: true,
        githubUser: ghUser.login,
        error: `PAT is valid but cannot access this repo. Check the token's repo permissions.`,
      });
    }

    return NextResponse.json({
      valid: true,
      repoPublic: false,
      githubUser: ghUser.login,
      repoName: patAccess.fullName,
      repoPrivate: patAccess.isPrivate,
    });
  } catch (error) {
    console.error("PAT verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
