import { NextRequest, NextResponse } from "next/server";
import { computeProofHash, computeUsernameHash } from "@/lib/proof-hash";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

function maskUsername(username: string): string {
  if (!username || username.length <= 2) return username;
  return username[0] + "*".repeat(username.length - 2) + username[username.length - 1];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, fid, username, message, signature, nonce, domain, pfpUrl } = body;

    if (!wallet || !fid || !username || !message || !signature || !nonce || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expectedDomain = new URL(process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).host;
    if (String(domain).toLowerCase() !== expectedDomain.toLowerCase()) {
      return NextResponse.json({ error: "Invalid Farcaster domain" }, { status: 400 });
    }

    const appClient = createAppClient({
      relay: process.env.NEXT_PUBLIC_FARCASTER_RELAY_URL || "https://relay.farcaster.xyz",
      ethereum: viemConnector({ rpcUrl: process.env.FARCASTER_RPC_URL }),
    });

    const rawSignature = String(signature);
    const normalizedSignature = rawSignature.startsWith("0x") ? rawSignature : `0x${rawSignature}`;

    const verify = await appClient.verifySignInMessage({
      nonce: String(nonce),
      domain: String(domain),
      message: String(message),
      signature: normalizedSignature as `0x${string}`,
    });

    if (verify.isError || !verify.success) {
      return NextResponse.json({ error: "Invalid Farcaster signature" }, { status: 401 });
    }

    if (Number(verify.fid) !== Number(fid)) {
      return NextResponse.json({ error: "Farcaster FID mismatch" }, { status: 401 });
    }

    let followerCount = 0;
    let resolvedPfp = String(pfpUrl || "");

    try {
      const res = await fetch(`https://api.warpcast.com/v2/user?fid=${encodeURIComponent(String(fid))}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        followerCount = Number(data?.result?.user?.followerCount || 0);
        resolvedPfp = String(data?.result?.user?.pfp?.url || resolvedPfp || "");
      }
    } catch {}

    return NextResponse.json({
      success: true,
      platform: "farcaster",
      proofHash: computeProofHash({ wallet: String(wallet), platform: "farcaster", platformUserId: String(fid) }),
      usernameHash: computeUsernameHash({ platform: "farcaster", username: String(username) }),
      maskedUsername: maskUsername(String(username)),
      pfpUrl: resolvedPfp,
      followerCount,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
