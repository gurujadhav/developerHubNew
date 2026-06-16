import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pat, repoUrl } = await request.json();

    if (!pat) {
      return NextResponse.json({ error: "PAT is required" }, { status: 400 });
    }

    // First verify the PAT is valid by checking the authenticated user
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { valid: false, error: "Invalid GitHub PAT — authentication failed" },
        { status: 200 }
      );
    }

    const ghUser = await userResponse.json();

    // If a repo URL is provided, check access to that specific repo
    if (repoUrl) {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (!match) {
        return NextResponse.json(
          { valid: false, error: "Invalid GitHub repository URL format" },
          { status: 200 }
        );
      }

      const [, owner, repo] = match;
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!repoResponse.ok) {
        return NextResponse.json({
          valid: false,
          error: `PAT is valid but cannot access repo "${owner}/${repo}". Check repo permissions.`,
          githubUser: ghUser.login,
        });
      }

      const repoData = await repoResponse.json();
      return NextResponse.json({
        valid: true,
        githubUser: ghUser.login,
        repoName: repoData.full_name,
        repoPrivate: repoData.private,
      });
    }

    return NextResponse.json({
      valid: true,
      githubUser: ghUser.login,
    });
  } catch (error) {
    console.error("PAT verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
