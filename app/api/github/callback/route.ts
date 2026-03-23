import { NextRequest, NextResponse } from 'next/server';

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function maskUsername(username: string): string {
  if (!username || username.length <= 4) return username;
  return username.slice(0, 2) + '****' + username.slice(-2);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const wallet = searchParams.get('state') || searchParams.get('wallet') || 'unknown';
  const mock = searchParams.get('mock');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    let login = 'mockuser23';
    let id = 123456;
    let public_repos = 47;

    if (!mock) {
      if (!code) throw new Error('No code provided');

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GITHUB_REDIRECT_URI,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description);

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'VerifyMe' },
      });
      const user = await userRes.json();
      login = user.login;
      id = user.id;
      public_repos = user.public_repos || 0;
    }

    const proofHash = await sha256(wallet + String(id));
    const usernameHash = await sha256(login);
    const maskedUsername = maskUsername(login);

    const params = new URLSearchParams({
      success: 'true',
      platform: 'github',
      proofHash,
      usernameHash,
      maskedUsername,
      wallet,
      repoCount: String(public_repos),
    });

    return NextResponse.redirect(`${appUrl}/verify?${params}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(`${appUrl}/verify?error=true&platform=github&message=${encodeURIComponent(msg)}`);
  }
}

