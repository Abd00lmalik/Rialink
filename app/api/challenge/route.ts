import { NextRequest, NextResponse } from "next/server";
import { issueWalletChallenge } from "@/lib/server/wallet-proof";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const wallet = normalizeWallet(req.nextUrl.searchParams.get("wallet"));
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const ip = getRequestIp(req);
  const rl = await checkRateLimit({
    key: `challenge:${ip}:${wallet}`,
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many challenge requests. Please retry shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds || 60) },
      }
    );
  }

  const challenge = await issueWalletChallenge(wallet);
  return NextResponse.json(challenge);
}

