import { NextRequest, NextResponse } from "next/server";

function maskUsername(username: string): string {
  if (!username || username.length <= 2) return username;
  return username[0] + "*".repeat(username.length - 2) + username[username.length - 1];
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").repeat(8).slice(0, 64);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, fid, username, custody, signature } = body;

    if (!wallet || !fid || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch real profile data from Warpcast
    let followerCount = 0;
    let pfpUrl = "";
    try {
      const res = await fetch(`https://api.warpcast.com/v2/user?fid=${fid}`, {
        headers: { "Accept": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        followerCount = data?.result?.user?.followerCount ?? 0;
        pfpUrl = data?.result?.user?.pfp?.url ?? "";
      }
    } catch {}

    const proofHash = simpleHash(wallet + String(fid));
    const usernameHash = simpleHash(username);
    const maskedUsername = maskUsername(username);

    return NextResponse.json({
      success: true,
      proofHash,
      usernameHash,
      maskedUsername,
      pfpUrl,
      followerCount,
      platform: "farcaster",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
