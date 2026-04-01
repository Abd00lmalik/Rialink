import { NextRequest, NextResponse } from "next/server";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { issueVerifiedSocialSession } from "@/lib/server/verification-session";
import { isValidWalletAddress } from "@/lib/server/wallet";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = String(body.wallet || "").trim();
    const fid = Number(body.fid);
    const message = String(body.message || "");
    const signature = String(body.signature || "");
    const nonce = String(body.nonce || "");
    const domain = String(body.domain || "");
    const pfpFromClient = String(body.pfpUrl || "");
    const usernameFromClient = String(body.username || "");

    if (!wallet || !Number.isFinite(fid) || !message || !signature || !nonce || !domain) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isValidWalletAddress(wallet)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    const expectedDomain = new URL(
      process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    ).host;
    if (domain.toLowerCase() !== expectedDomain.toLowerCase()) {
      return NextResponse.json({ error: "Invalid Farcaster domain" }, { status: 400 });
    }

    const appClient = createAppClient({
      relay:
        process.env.NEXT_PUBLIC_FARCASTER_RELAY_URL ||
        "https://relay.farcaster.xyz",
      ethereum: viemConnector({ rpcUrl: process.env.FARCASTER_RPC_URL }),
    });

    const normalizedSignature = signature.startsWith("0x")
      ? signature
      : `0x${signature}`;

    const verify = await appClient.verifySignInMessage({
      nonce,
      domain,
      message,
      signature: normalizedSignature as `0x${string}`,
    });

    if (verify.isError || !verify.success) {
      return NextResponse.json(
        { error: "Invalid Farcaster signature" },
        { status: 401 }
      );
    }

    if (Number(verify.fid) !== fid) {
      return NextResponse.json({ error: "Farcaster FID mismatch" }, { status: 401 });
    }

    let followerCount = 0;
    let username = usernameFromClient;
    let resolvedPfp = pfpFromClient;
    let fullName = "";

    // Pull public profile metadata from FID so displayed identity is server-resolved.
    try {
      const profileRes = await fetch(
        `https://api.warpcast.com/v2/user?fid=${encodeURIComponent(String(fid))}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const user = profileData?.result?.user;
        followerCount = Number(user?.followerCount || 0);
        username = String(user?.username || username || `fid:${fid}`);
        resolvedPfp = String(user?.pfp?.url || resolvedPfp || "");
        fullName = String(
          user?.displayName ||
            user?.display_name ||
            user?.name ||
            fullName ||
            username ||
            `fid:${fid}`
        ).trim();
      }
    } catch {
      // keep fallback values if profile lookup fails
    }

    if (!username) {
      username = `fid:${fid}`;
    }
    if (!fullName) {
      fullName = username;
    }

    const verifiedSession = await issueVerifiedSocialSession({
      wallet,
      platform: "farcaster",
      userId: String(fid),
      username,
      fullName,
      proofMethod: "farcaster-signin+wallet-signature",
      providerSessionId: `farcaster:${fid}:${nonce}`,
      pfpUrl: resolvedPfp,
      followerCount: Number.isFinite(followerCount) ? followerCount : 0,
    });

    return NextResponse.json({
      success: true,
      platform: "farcaster",
      verificationToken: verifiedSession.id,
      expiresAt: verifiedSession.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
