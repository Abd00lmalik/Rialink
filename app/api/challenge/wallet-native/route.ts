/**
 * POST /api/challenge/wallet-native
 *
 * Issue a challenge for wallet-native verification.
 * The user signs a message proving they own the wallet,
 * then we link any verified identity proofs to it.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";

interface WalletNativeChallenge {
  nonce: string;
  message: string;
  expiresAt: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const wallet = normalizeWallet(body?.wallet);

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Rate limit
  const ip = getRequestIp(req);
  const rl = await checkRateLimit({
    key: `wallet-native-challenge:${ip}:${wallet}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many challenge requests. Please retry shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds || 60) } }
    );
  }

  // Generate nonce
  const nonce = randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const expiresAt = new Date(timestamp + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Create the message to sign
  const message = [
    "Rialink Identity Verification",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt}`,
    "",
    "By signing this message, you verify ownership of this wallet.",
  ].join("\n");

  // Store nonce in Redis (TTL 5 minutes)
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    const key = `wallet-native:${wallet}:${nonce}`;
    await redis.set(key, JSON.stringify({ nonce, wallet, timestamp, expiresAt }), { ex: 300 });
  } catch {
    // Redis unavailable — still issue the challenge, verification may fail
  }

  const response: WalletNativeChallenge = {
    nonce,
    message,
    expiresAt,
  };

  return NextResponse.json(response);
}
