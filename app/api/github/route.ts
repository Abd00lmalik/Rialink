import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://verifyme-two.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!wallet) {
    return NextResponse.redirect(`${APP_URL}/verify?error=true&platform=github&message=${encodeURIComponent("Missing wallet address")}`);
  }

  if (!clientId) {
    return NextResponse.redirect(`${APP_URL}/verify?error=true&platform=github&message=${encodeURIComponent("GitHub OAuth is not configured")}`);
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${APP_URL}/api/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user",
    state: wallet,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
