import { NextRequest, NextResponse } from "next/server";
import {
  consumeOAuthRequestSession,
  issueVerifiedSocialSession,
} from "@/lib/server/verification-session";

export const runtime = "nodejs";

async function getCommitCountFromRecentPublicEvents(
  login: string,
  token: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "VerifyMe",
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    const events = await res.json();
    if (!Array.isArray(events)) return null;

    let commits = 0;
    for (const ev of events) {
      if (ev?.type === "PushEvent" && Array.isArray(ev?.payload?.commits)) {
        commits += ev.payload.commits.length;
      }
    }
    return Number.isFinite(commits) ? commits : null;
  } catch {
    return null;
  }
}

async function getCommitCountFromContributionsApi(
  login: string,
  token: string
): Promise<number | null> {
  try {
    const to = new Date();
    const from = new Date(to);
    from.setFullYear(to.getFullYear() - 1);

    const query = `
      query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
          }
        }
      }
    `;

    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "VerifyMe",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          login,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return null;
    }

    const commits = Number(
      data?.data?.user?.contributionsCollection?.totalCommitContributions
    );
    if (!Number.isFinite(commits) || commits < 0) return null;
    return commits;
  } catch {
    return null;
  }
}

async function getCommitCount(login: string, token: string): Promise<number> {
  const [contributionCommits, recentEventCommits] = await Promise.all([
    getCommitCountFromContributionsApi(login, token),
    getCommitCountFromRecentPublicEvents(login, token),
  ]);

  if (
    typeof contributionCommits === "number" &&
    typeof recentEventCommits === "number"
  ) {
    return Math.max(contributionCommits, recentEventCommits);
  }
  if (typeof contributionCommits === "number") return contributionCommits;
  if (typeof recentEventCommits === "number") return recentEventCommits;
  return 0;
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const { searchParams } = new URL(req.url);
  const code = String(searchParams.get("code") || "").trim();
  const state = String(searchParams.get("state") || "").trim();

  try {
    if (!state) throw new Error("Missing OAuth session");
    if (!code) throw new Error("No code provided");

    const oauthSession = await consumeOAuthRequestSession(state, "github");
    if (!oauthSession) {
      throw new Error("GitHub session expired. Please reconnect.");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:
          process.env.GITHUB_REDIRECT_URI || `${appUrl}/api/github/callback`,
      }),
      cache: "no-store",
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

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
    const username = String(user?.login || "").trim();
    const userId = String(user?.id || "").trim();
    if (!username || !userId) throw new Error("GitHub user lookup failed");

    const publicRepos = Number(user?.public_repos || 0);
    const avatarUrl = String(
      user?.avatar_url || `https://avatars.githubusercontent.com/u/${userId}?v=4`
    );
    const commitCount = await getCommitCount(username, token);

    // We store provider-verified identity in a short-lived server session token.
    // The frontend only sends this token to /api/proof, so users cannot forge usernames/user IDs.
    const verifiedSession = await issueVerifiedSocialSession({
      wallet: oauthSession.wallet,
      platform: "github",
      userId,
      username,
      proofMethod: "oauth+wallet-signature",
      providerSessionId: oauthSession.id,
      pfpUrl: avatarUrl,
      repoCount: Number.isFinite(publicRepos) ? publicRepos : 0,
      commitCount: Number.isFinite(commitCount) ? commitCount : 0,
    });

    const params = new URLSearchParams({
      success: "true",
      platform: "github",
      session: verifiedSession.id,
    });

    return NextResponse.redirect(`${appUrl}/verify?${params.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${appUrl}/verify?error=true&platform=github&message=${encodeURIComponent(message)}`
    );
  }
}
