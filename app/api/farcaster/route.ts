import { NextRequest, NextResponse } from "next/server";
import { computeProofHash, computeUsernameHash } from "@/lib/proof-hash";

function maskUsername(username: string): string {
  if (!username || username.length <= 2) return username;
  return username[0] + "*".repeat(username.length - 2) + username[username.length - 1];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, fid, username } = body;

    if (!wallet || !fid || !username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let followerCount = 0;
    let pfpUrl = "";

    try {
      const res = await fetch(`https://api.warpcast.com/v2/user?fid=${encodeURIComponent(String(fid))}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        followerCount = Number(data?.result?.user?.followerCount || 0);
        pfpUrl = String(data?.result?.user?.pfp?.url || "");
      }
    } catch {}

    return NextResponse.json({
      success: true,
      platform: "farcaster",
      proofHash: computeProofHash({ wallet: String(wallet), platform: "farcaster", platformUserId: String(fid) }),
      usernameHash: computeUsernameHash({ platform: "farcaster", username: String(username) }),
      maskedUsername: maskUsername(String(username)),
      pfpUrl,
      followerCount,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
