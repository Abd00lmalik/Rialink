import { NextRequest, NextResponse } from "next/server";

function sha256(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").repeat(8).slice(0, 64);
}

function maskUsername(username: string): string {
  if (!username || username.length <= 4) return username;
  return username.slice(0, 2) + "****" + username.slice(-2);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const wallet = searchParams.get("state") || searchParams.get("wallet") || "unknown";
  const mock = searchParams.get("mock");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    let username = "mockuser";
    let id = "123456789";
    let avatar = "";

    if (!mock) {
      if (!code) throw new Error("No code provided");

      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID || "",
          client_secret: process.env.DISCORD_CLIENT_SECRET || "",
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/discord/callback`,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userRes.json();
      username = user.username;
      id = user.id;
      // Build CDN avatar URL (fallback to default if no avatar set)
      avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;
    }

    const proofHash = sha256(wallet + id);
    const usernameHash = sha256(username);
    const maskedUsername = maskUsername(username);

    const params = new URLSearchParams({
      success: "true",
      platform: "discord",
      proofHash,
      usernameHash,
      maskedUsername,
      pfpUrl: avatar,
      wallet,
    });

    return NextResponse.redirect(`${appUrl}/verify?${params}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(`${appUrl}/verify?error=true&platform=discord&message=${encodeURIComponent(msg)}`);
  }
}
