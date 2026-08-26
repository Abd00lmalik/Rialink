/**
 * GET /api/identity/:wallet
 *
 * Composability endpoint — structured identity for other Rialo protocols.
 * Returns a machine-readable identity state with proofs, trust level,
 * and verification metadata.
 *
 * Other dApps can call this to read a wallet's Rialink identity
 * without going through the full verification flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { computeProofHash } from "@/lib/proof-hash";
import { verifyStoredProof } from "@/lib/server/verify-proof";
import { signProof } from "@/lib/server/proof-signing";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { deriveTrustLevelFromCount } from "@/lib/trust-level";
import { isValidWalletAddress } from "@/lib/server/wallet";
import { EXPLORER_URL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Platform = "github" | "discord" | "farcaster";

interface IdentityProof {
  platform: Platform;
  username: string;
  userId: string;
  verifiedAt: string;
  proofHash: string;
  chain?: string;
  txSignature?: string;
  explorerUrl?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
}

interface IdentityResponse {
  schema: "rialink.identity.v1";
  wallet: string;
  trustLevel: "high" | "medium" | "low" | "none";
  verifiedPlatforms: Platform[];
  totalVerified: number;
  maxPossible: number;
  proofs: IdentityProof[];
  chain: string;
  explorerUrl: string | null;
  identityRoot: string | null;
  accountAgeDays: number | null;
  lastVerifiedAt: string | null;
  queriedAt: string;
}

const PLATFORM_ORDER: Platform[] = ["github", "discord", "farcaster"];

function isPlatform(value: string): value is Platform {
  return PLATFORM_ORDER.includes(value as Platform);
}

function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

function normalizeRow(row: unknown, walletFromKey?: string) {
  if (!row || typeof row !== "object") return null;
  const obj = row as Record<string, unknown>;
  const wallet = String(obj.wallet || walletFromKey || "").trim();
  if (!wallet) return null;
  const platform = String(obj.platform || "").trim().toLowerCase();
  if (!isPlatform(platform)) return null;

  const username = String(obj.username || obj.maskedUsername || "").trim();
  const userId = String(obj.userId || obj.user_id || "").trim();
  const fullName = String(obj.fullName || obj.full_name || "").trim();
  const proofHashInput = String(obj.proofHash || obj.proof_hash || "").trim();
  const nonce = String(obj.nonce || "").trim() || "legacy";
  const version = obj.version === "v2" ? "v2" : "v1";
  const issuedAt = Number(obj.issuedAt || obj.issued_at || 0);

  const normalizedUserId = userId || `${platform}:unknown`;
  const proofHash =
    proofHashInput ||
    computeProofHash({ wallet, platform, platformUserId: normalizedUserId, nonce, version });

  let signature = String(obj.signature || "").trim();
  if (!signature && proofHash) {
    try { signature = signProof(proofHash); } catch { signature = ""; }
  }

  const verifiedAt = String(obj.verifiedAt || obj.verified_at || "").trim();
  const chain = String(obj.chain || "").trim();
  const txSignature = String(obj.txSignature || "").trim();

  const proof = {
    wallet,
    platform,
    userId: normalizedUserId,
    username: username || normalizedUserId,
    ...(fullName ? { fullName } : {}),
    proofHash,
    signature,
    nonce,
    issuedAt: Number.isFinite(issuedAt) ? issuedAt : 0,
    version,
    verifiedAt,
    verified: obj.verified !== false,
    ...(chain ? { chain } : {}),
    ...(txSignature ? { txSignature } : {}),
    ...(String(obj.pfpUrl || "").trim() ? { pfpUrl: String(obj.pfpUrl).trim() } : {}),
    ...(Number(obj.repoCount) || undefined ? { repoCount: Number(obj.repoCount) } : {}),
    ...(Number(obj.commitCount) || undefined ? { commitCount: Number(obj.commitCount) } : {}),
    ...(Number(obj.followerCount) || undefined ? { followerCount: Number(obj.followerCount) } : {}),
    ...(Number(obj.serverCount) || undefined ? { serverCount: Number(obj.serverCount) } : {}),
  };

  // Verify the proof
  return verifyStoredProof(proof as any) ? proof : null;
}

async function readVerifiedProofs(wallet: string) {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const rows = (await redis.lrange<unknown>(`proofs:${wallet}`, 0, -1)) || [];
    return rows
      .map((row) => normalizeRow(row, wallet))
      .filter((row): row is NonNullable<ReturnType<typeof normalizeRow>> => !!row && row.verified);
  } catch {
    return [];
  }
}

function computeIdentityRoot(proofs: { proofHash: string }[]): string {
  const joined = proofs.map((p) => p.proofHash).join(":");
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(joined).digest("hex").slice(0, 32);
}

export async function OPTIONS() {
  return publicCorsOptions("GET, OPTIONS");
}

export async function GET(
  _req: NextRequest,
  context: { params: { wallet: string } }
) {
  const wallet = String(context.params.wallet || "").trim();

  if (!wallet) {
    return withPublicCors(
      NextResponse.json({ error: "wallet is required" }, { status: 400 }),
      "GET, OPTIONS"
    );
  }

  if (!isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Invalid wallet address" }, { status: 400 }),
      "GET, OPTIONS"
    );
  }

  const proofs = await readVerifiedProofs(wallet);
  const sorted = proofs.sort(
    (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
  );

  const verifiedPlatforms = PLATFORM_ORDER.filter((p) =>
    proofs.some((pr) => pr.platform === p)
  );
  const totalVerified = verifiedPlatforms.length;
  const trustLevel = deriveTrustLevelFromCount(totalVerified);

  const identityRoot = proofs.length > 0 ? computeIdentityRoot(proofs) : null;

  // Account age from oldest proof
  const oldestIssuedAt = proofs
    .filter((p) => p.issuedAt > 0)
    .sort((a, b) => a.issuedAt - b.issuedAt)[0]?.issuedAt;
  const accountAgeDays = oldestIssuedAt
    ? Math.floor((Date.now() - oldestIssuedAt) / (1000 * 60 * 60 * 24))
    : null;

  // Last verified
  const lastVerifiedAt = proofs
    .filter((p) => p.verifiedAt)
    .sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime())[0]
    ?.verifiedAt || null;

  const response: IdentityResponse = {
    schema: "rialink.identity.v1",
    wallet,
    trustLevel,
    verifiedPlatforms,
    totalVerified,
    maxPossible: 3,
    proofs: sorted.map((p) => ({
      platform: p.platform,
      username: p.username,
      userId: p.userId,
      verifiedAt: p.verifiedAt,
      proofHash: p.proofHash,
      ...(p.chain && p.txSignature
        ? { chain: p.chain, txSignature: p.txSignature, explorerUrl: `${EXPLORER_URL}/tx/${p.txSignature}` }
        : {}),
      ...(p.repoCount !== undefined ? { repoCount: p.repoCount } : {}),
      ...(p.commitCount !== undefined ? { commitCount: p.commitCount } : {}),
      ...(p.followerCount !== undefined ? { followerCount: p.followerCount } : {}),
      ...(p.serverCount !== undefined ? { serverCount: p.serverCount } : {}),
    })),
    chain: "rialo-devnet",
    explorerUrl: EXPLORER_URL,
    identityRoot,
    accountAgeDays,
    lastVerifiedAt,
    queriedAt: new Date().toISOString(),
  };

  return withPublicCors(NextResponse.json(response), "GET, OPTIONS");
}
