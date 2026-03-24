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
    let login = "mockuser23";
    let id = 123456;
    let public_repos = 47;
    let avatar_url = "";

    if (!mock) {
      if (!code) throw new Error("No code provided");

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GITHUB_REDIRECT_URI,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description);

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "VerifyMe",
        },
      });
      const user = await userRes.json();
      login = user.login;
      id = user.id;
      public_repos = user.public_repos || 0;
      avatar_url = user.avatar_url || "";
    }

    const proofHash = sha256(wallet + String(id));
    const usernameHash = sha256(login);
    const maskedUsername = maskUsername(login);

    const params = new URLSearchParams({
      success: "true",
      platform: "github",
      proofHash,
      usernameHash,
      maskedUsername,
      pfpUrl: avatar_url,
      wallet,
      repoCount: String(public_repos),
    });

    return NextResponse.redirect(`${appUrl}/verify?${params}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${appUrl}/verify?error=true&platform=github&message=${encodeURIComponent(msg)}`
    );
  }
}
