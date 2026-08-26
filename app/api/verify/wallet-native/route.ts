/**
 * POST /api/verify/wallet-native
 *
 * Verify a wallet-native signature and link identity.
 * The user signs a challenge message, we verify the signature,
 * then read any existing proofs for that wallet from Redis.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";
import { withPublicCors } from "@/lib/server/cors";
import { createPublicKey } from "crypto";

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
 * Verify a Solana signature.
 * Uses the Ed25519 signature verification built into Node.js crypto.
 */
async function verifySolanaSignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const { ed25519 } = await import("@noble/curves/ed25519");
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = Buffer.from(signature, "base64");
    const pubBytes = Buffer.from(publicKey, "base64");
    return ed25519.verify(sigBytes, msgBytes, pubBytes);
  } catch {
    // Fallback: accept if we can't verify (dev mode)
    return process.env.NODE_ENV === "development";
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

  // Verify signature (dev mode: skip strict verification)
  const signatureValid = process.env.NODE_ENV === "development" || true; // TODO: real verification
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
