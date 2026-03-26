import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://verifyme-two.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!wallet) {
    return NextResponse.redirect(`${APP_URL}/verify?error=true&platform=discord&message=${encodeURIComponent("Missing wallet address")}`);
  }

  if (!clientId) {
    return NextResponse.redirect(`${APP_URL}/verify?error=true&platform=discord&message=${encodeURIComponent("Discord OAuth is not configured")}`);
  }

  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${APP_URL}/api/discord/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state: wallet,
    prompt: "consent",
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
