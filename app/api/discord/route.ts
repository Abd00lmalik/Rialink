import { NextRequest, NextResponse } from "next/server";
import { issueOAuthRequestSession } from "@/lib/server/verification-session";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const { searchParams } = new URL(req.url);
  const wallet = normalizeWallet(searchParams.get("wallet"));
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!wallet) {
    return NextResponse.redirect(`${appUrl}/verify?error=true&platform=discord&message=${encodeURIComponent("Missing wallet address")}`);
  }
  if (!isValidWalletAddress(wallet)) {
    return NextResponse.redirect(
      `${appUrl}/verify?error=true&platform=discord&message=${encodeURIComponent("Invalid wallet address")}`
    );
  }

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/verify?error=true&platform=discord&message=${encodeURIComponent("Discord OAuth is not configured")}`);
  }

  // Keep OAuth state server-issued to prevent forged frontend payloads.
  const oauthSession = await issueOAuthRequestSession({ wallet, platform: "discord" });

  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${appUrl}/api/discord/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state: oauthSession.id,
    prompt: "consent",
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}

