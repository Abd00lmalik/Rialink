import { NextRequest, NextResponse } from "next/server";
import { issueOAuthRequestSession } from "@/lib/server/verification-session";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const { searchParams } = new URL(req.url);
  const wallet = normalizeWallet(searchParams.get("wallet"));
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!wallet) {
    return NextResponse.redirect(`${appUrl}/verify?error=true&platform=github&message=${encodeURIComponent("Missing wallet address")}`);
  }
  if (!isValidWalletAddress(wallet)) {
    return NextResponse.redirect(
      `${appUrl}/verify?error=true&platform=github&message=${encodeURIComponent("Invalid wallet address")}`
    );
  }

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/verify?error=true&platform=github&message=${encodeURIComponent("GitHub OAuth is not configured")}`);
  }

  // We never pass the raw wallet in OAuth state. We issue a server session token and
  // consume it in the callback, so only server-created OAuth sessions can create proofs.
  const oauthSession = await issueOAuthRequestSession({ wallet, platform: "github" });

  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${appUrl}/api/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user",
    state: oauthSession.id,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

