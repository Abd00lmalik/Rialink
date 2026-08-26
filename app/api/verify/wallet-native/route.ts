/**
 * POST /api/verify/wallet-native
 *
 * Verify a wallet-native signature and link identity.
 * The user signs a challenge message, we verify the Ed25519 signature,
 * then read any existing proofs for that wallet from Redis.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";
import { withPublicCors } from "@/lib/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyResult {
  wallet: string;
  verified: boolean;
  method: "wallet-native";
  identityLinked: boolean;
  verifiedAt: string;
}

function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

/**
 * Verify a Solana Ed25519 signature.
 *
 * Solana wallets (Phantom, Solflare, Backpack) sign UTF-8 message bytes
 * using Ed25519. The public key is the wallet's base58 address (32 bytes).
 */
async function verifySolanaSignature(
  message: string,
  signature: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const { ed25519 } = await import("@noble/curves/ed25519");
    const bs58 = await import("bs58");

    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = Buffer.from(signature, "base64");
    const pubBytes = bs58.default.decode(walletAddress);

    if (sigBytes.length !== 64) return false;
    if (pubBytes.length !== 32) return false;

    return ed25519.verify(sigBytes, msgBytes, pubBytes);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const wallet = normalizeWallet(body?.wallet);
  const signature = body?.signature;
  const message = body?.message;
  const nonce = body?.nonce;

  if (!wallet || !signature || !message || !nonce) {
    return withPublicCors(
      NextResponse.json(
        { error: "wallet, signature, message, and nonce are required" },
        { status: 400 }
      ),
      "POST, OPTIONS"
    );
  }

  if (!isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Invalid wallet address" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  // Rate limit
  const ip = getRequestIp(req);
  const rl = await checkRateLimit({
    key: `wallet-native-verify:${ip}:${wallet}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.ok) {
    return withPublicCors(
      NextResponse.json(
        { error: "Too many verification requests" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds || 60) } }
      ),
      "POST, OPTIONS"
    );
  }

  // Verify nonce exists in Redis
  const redis = getRedis();
  if (!redis) {
    return withPublicCors(
      NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 }),
      "POST, OPTIONS"
    );
  }

  const key = `wallet-native:${wallet}:${nonce}`;
  const stored = await redis.get<Record<string, unknown>>(key);
  if (!stored) {
    return withPublicCors(
      NextResponse.json({ error: "Challenge expired or invalid" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  // Delete nonce (one-time use)
  await redis.del(key);

  // Verify the message matches what we expect
  if (message !== String(stored.message || "")) {
    return withPublicCors(
      NextResponse.json({ error: "Message mismatch" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  // Verify the wallet address matches the challenge
  if (wallet !== String(stored.wallet || "")) {
    return withPublicCors(
      NextResponse.json({ error: "Wallet mismatch" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  // Verify Ed25519 signature
  const signatureValid = await verifySolanaSignature(message, signature, wallet);
  if (!signatureValid) {
    return withPublicCors(
      NextResponse.json({ error: "Invalid signature" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  // Link identity — read any existing proofs for this wallet
  const proofKey = `proofs:${wallet}`;
  const existingProofs = (await redis.lrange<unknown>(proofKey, 0, -1)) || [];

  const verifiedAt = new Date().toISOString();

  // Update each proof's wallet-native verification status
  for (let i = 0; i < existingProofs.length; i++) {
    const proof = existingProofs[i] as Record<string, unknown>;
    if (proof && typeof proof === "object") {
      proof.walletNativeVerified = true;
      proof.walletNativeVerifiedAt = verifiedAt;
      await redis.lset(proofKey, i, proof);
    }
  }

  const response: VerifyResult = {
    wallet,
    verified: true,
    method: "wallet-native",
    identityLinked: existingProofs.length > 0,
    verifiedAt,
  };

  return withPublicCors(NextResponse.json(response), "POST, OPTIONS");
}
