import { NextRequest, NextResponse } from "next/server";
import { computeProofHash, computeUsernameHash } from "@/lib/proof-hash";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://verifyme-two.vercel.app";

function maskUsername(username: string): string {
  if (!username || username.length <= 4) return username;
  return username.slice(0, 2) + "****" + username.slice(-2);
}

function discordAccountCreated(id: string): string {
  try {
    const ms = Math.floor(parseInt(id, 10) / 4194304) + 1420070400000;
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const wallet = searchParams.get("state") || searchParams.get("wallet");

  try {
    if (!wallet) throw new Error("Missing wallet address");
    if (!code) throw new Error("No code provided");

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || `${APP_URL}/api/discord/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const token = String(tokenData.access_token || "");
    if (!token) throw new Error("No Discord token");

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const user = await userRes.json();
    const username = String(user?.username || "");
    const id = String(user?.id || "");
    if (!username || !id) throw new Error("Discord user lookup failed");

    const avatar = user?.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(user?.discriminator || 0) % 5}.png`;

    let serverCount = 0;
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (guildsRes.ok) {
      const guilds = await guildsRes.json();
      serverCount = Array.isArray(guilds) ? guilds.length : 0;
    }

    const params = new URLSearchParams({
      success: "true",
      platform: "discord",
      proofHash: computeProofHash({ wallet, platform: "discord", platformUserId: id }),
      usernameHash: computeUsernameHash({ platform: "discord", username }),
      maskedUsername: maskUsername(username),
      pfpUrl: avatar,
      accountCreatedAt: discordAccountCreated(id),
      serverCount: String(serverCount),
      wallet,
    });

    return NextResponse.redirect(`${APP_URL}/verify?${params.toString()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(`${APP_URL}/verify?error=true&platform=discord&message=${encodeURIComponent(msg)}`);
  }
}
