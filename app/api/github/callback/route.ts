import { NextRequest, NextResponse } from "next/server";
import { computeProofHash, computeUsernameHash } from "@/lib/proof-hash";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://verifyme-two.vercel.app";

function maskUsername(username: string): string {
  if (!username || username.length <= 4) return username;
  return username.slice(0, 2) + "****" + username.slice(-2);
}

async function getCommitCount(login: string, token: string): Promise<number> {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "VerifyMe",
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (!res.ok) return 0;
    const events = await res.json();
    if (!Array.isArray(events)) return 0;

    let commits = 0;
    for (const ev of events) {
      if (ev?.type === "PushEvent" && Array.isArray(ev?.payload?.commits)) commits += ev.payload.commits.length;
    }
    return commits;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const wallet = searchParams.get("state") || searchParams.get("wallet");

  try {
    if (!wallet) throw new Error("Missing wallet address");
    if (!code) throw new Error("No code provided");

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI || `${APP_URL}/api/github/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const token = String(tokenData.access_token || "");
    if (!token) throw new Error("No GitHub token");

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "VerifyMe",
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    const user = await userRes.json();
    const login = String(user?.login || "");
    const id = String(user?.id || "");
    const publicRepos = Number(user?.public_repos || 0);
    const avatarUrl = String(user?.avatar_url || (id ? `https://avatars.githubusercontent.com/u/${id}?v=4` : ""));
    if (!login || !id) throw new Error("GitHub user lookup failed");

    const commitCount = await getCommitCount(login, token);

    const params = new URLSearchParams({
      success: "true",
      platform: "github",
      proofHash: computeProofHash({ wallet, platform: "github", platformUserId: id }),
      usernameHash: computeUsernameHash({ platform: "github", username: login }),
      maskedUsername: maskUsername(login),
      pfpUrl: avatarUrl,
      wallet,
      repoCount: String(publicRepos),
      commitCount: String(commitCount),
    });

    return NextResponse.redirect(`${APP_URL}/verify?${params.toString()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(`${APP_URL}/verify?error=true&platform=github&message=${encodeURIComponent(msg)}`);
  }
}
