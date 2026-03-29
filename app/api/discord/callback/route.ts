import { NextRequest, NextResponse } from "next/server";
import {
  consumeOAuthRequestSession,
  issueVerifiedSocialSession,
} from "@/lib/server/verification-session";

export const runtime = "nodejs";

function discordAccountCreated(id: string): string {
  try {
    const ms = Math.floor(parseInt(id, 10) / 4194304) + 1420070400000;
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const { searchParams } = new URL(req.url);
  const code = String(searchParams.get("code") || "").trim();
  const state = String(searchParams.get("state") || "").trim();

  try {
    if (!state) throw new Error("Missing OAuth session");
    if (!code) throw new Error("No code provided");

    const oauthSession = await consumeOAuthRequestSession(state, "discord");
    if (!oauthSession) {
      throw new Error("Discord session expired. Please reconnect.");
    }

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
        redirect_uri:
          process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/discord/callback`,
      }),
      cache: "no-store",
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const token = String(tokenData.access_token || "");
    if (!token) throw new Error("No Discord token");

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const user = await userRes.json();

    const username = String(user?.username || "").trim();
    const userId = String(user?.id || "").trim();
    if (!username || !userId) throw new Error("Discord user lookup failed");
    const fullName =
      String(user?.global_name || user?.display_name || username).trim() ||
      username;

    const avatar = user?.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${
          Number(user?.discriminator || 0) % 5
        }.png`;

    let serverCount = 0;
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (guildsRes.ok) {
      const guilds = await guildsRes.json();
      serverCount = Array.isArray(guilds) ? guilds.length : 0;
    }

    const verifiedSession = await issueVerifiedSocialSession({
      wallet: oauthSession.wallet,
      platform: "discord",
      userId,
      username,
      fullName,
      proofMethod: "oauth+wallet-signature",
      providerSessionId: oauthSession.id,
      pfpUrl: avatar,
      accountCreatedAt: discordAccountCreated(userId),
      serverCount: Number.isFinite(serverCount) ? serverCount : 0,
    });

    const params = new URLSearchParams({
      success: "true",
      platform: "discord",
      session: verifiedSession.id,
    });

    return NextResponse.redirect(`${appUrl}/verify?${params.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${appUrl}/verify?error=true&platform=discord&message=${encodeURIComponent(message)}`
    );
  }
}
