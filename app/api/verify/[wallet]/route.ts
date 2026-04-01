import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { ProofRecord } from "@/lib/types";
import { computeProofHash } from "@/lib/proof-hash";
import { signProof } from "@/lib/server/proof-signing";
import { verifyStoredProof } from "@/lib/server/verify-proof";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { deriveTrustLevelFromCount } from "@/lib/trust-level";
import { isValidWalletAddress } from "@/lib/server/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Platform = "github" | "discord" | "farcaster";

interface StoredProofRow {
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  fullName?: string;
  proofHash: string;
  signature: string;
  nonce: string;
  issuedAt: number;
  version: "v1" | "v2";
  verifiedAt: string;
  verified: boolean;
  pfpUrl?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
}

const MAX_POSSIBLE = 3;
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

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function normalizeProofRow(row: unknown, walletFromKey?: string): StoredProofRow | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as Record<string, unknown>;

  const wallet = String(obj.wallet || walletFromKey || "").trim();
  if (!wallet) return null;

  const platformValue = String(obj.platform || "").trim().toLowerCase();
  if (!isPlatform(platformValue)) return null;

  const usernameRaw = String(obj.username || obj.maskedUsername || "").trim();
  const userId = String(obj.userId || obj.user_id || "").trim();
  const username =
    usernameRaw ||
    (userId || `${platformValue}:unknown`);
  const fullName = String(obj.fullName || obj.full_name || "").trim();
  const proofHashInput = String(obj.proofHash || obj.proof_hash || "").trim();
  const nonce = String(obj.nonce || "").trim() || "legacy";
  const issuedAtRaw = Number(obj.issuedAt || obj.issued_at || 0);
  const version = obj.version === "v2" ? "v2" : "v1";
  const normalizedUserId = userId || `${platformValue}:unknown`;
  const proofHash =
    proofHashInput ||
    computeProofHash({
      wallet,
      platform: platformValue,
      platformUserId: normalizedUserId,
      nonce,
      version,
    });
  let signature = String(obj.signature || "").trim();
  if (!signature && proofHash) {
    try {
      signature = signProof(proofHash);
    } catch {
      signature = "";
    }
  }
  const verifiedAt = String(obj.verifiedAt || obj.verified_at || "").trim();
  const pfpUrl = String(obj.pfpUrl || obj.pfp_url || "").trim();

  return {
    wallet,
    platform: platformValue,
    userId: normalizedUserId,
    username,
    ...(fullName ? { fullName } : {}),
    proofHash,
    signature,
    nonce,
    issuedAt: Number.isFinite(issuedAtRaw) ? issuedAtRaw : 0,
    version,
    verifiedAt,
    verified: obj.verified !== false,
    ...(pfpUrl ? { pfpUrl } : {}),
    ...(toNumberOrUndefined(obj.repoCount) !== undefined
      ? { repoCount: toNumberOrUndefined(obj.repoCount) }
      : {}),
    ...(toNumberOrUndefined(obj.commitCount) !== undefined
      ? { commitCount: toNumberOrUndefined(obj.commitCount) }
      : {}),
    ...(toNumberOrUndefined(obj.followerCount) !== undefined
      ? { followerCount: toNumberOrUndefined(obj.followerCount) }
      : {}),
    ...(toNumberOrUndefined(obj.serverCount) !== undefined
      ? { serverCount: toNumberOrUndefined(obj.serverCount) }
      : {}),
  };
}

async function readProofs(wallet: string): Promise<StoredProofRow[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const key = `proofs:${wallet}`;
    const rows = (await redis.lrange<unknown>(key, 0, -1)) || [];
    return rows
      .map((row) => normalizeProofRow(row, wallet))
      .filter((row): row is StoredProofRow => !!row);
  } catch {
    return [];
  }
}

function toProofRecord(proof: StoredProofRow): ProofRecord {
  return {
    wallet: proof.wallet,
    platform: proof.platform,
    userId: proof.userId,
    username: proof.username,
    ...(proof.fullName ? { fullName: proof.fullName } : {}),
    verified: proof.verified,
    verifiedAt: proof.verifiedAt,
    nonce: proof.nonce,
    issuedAt: proof.issuedAt,
    signature: proof.signature,
    version: proof.version,
    proofMethod: "verify-api",
    proofHash: proof.proofHash,
    bindingProof: {
      method: "verify-api",
      algorithm: "HS256",
      verifier: "rialink-api",
      issuedAt: proof.verifiedAt,
      socialSessionId: "verify-api",
      walletNonce: "",
      walletSignature: "",
      walletMessage: "",
      token: "",
    },
    ...(proof.pfpUrl ? { pfpUrl: proof.pfpUrl } : {}),
    ...(proof.repoCount !== undefined ? { repoCount: proof.repoCount } : {}),
    ...(proof.commitCount !== undefined ? { commitCount: proof.commitCount } : {}),
    ...(proof.followerCount !== undefined ? { followerCount: proof.followerCount } : {}),
    ...(proof.serverCount !== undefined ? { serverCount: proof.serverCount } : {}),
  };
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
      NextResponse.json(
        { error: "wallet is required", queriedAt: new Date().toISOString() },
        { status: 400 }
      ),
      "GET, OPTIONS"
    );
  }
  if (!isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json(
        { error: "Invalid wallet address", queriedAt: new Date().toISOString() },
        { status: 400 }
      ),
      "GET, OPTIONS"
    );
  }

  const allProofs = await readProofs(wallet);
  const proofs = allProofs
    .filter((proof) => proof.verified)
    .filter((proof) => verifyStoredProof(toProofRecord(proof)))
    .sort(
      (a, b) =>
        PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
    );

  const verifiedPlatforms = PLATFORM_ORDER.filter((platform) =>
    proofs.some((proof) => proof.platform === platform)
  );
  const totalVerified = verifiedPlatforms.length;
  const trustLevel = deriveTrustLevelFromCount(totalVerified);

  const response = NextResponse.json({
    wallet,
    valid: totalVerified > 0,
    trustLevel,
    verifiedPlatforms,
    totalVerified,
    maxPossible: MAX_POSSIBLE,
    proofs: proofs.map((proof) => ({
      platform: proof.platform,
      userId: proof.userId,
      user_id: proof.userId,
      username: proof.username,
      ...(proof.fullName ? { fullName: proof.fullName } : {}),
      ...(proof.pfpUrl ? { pfpUrl: proof.pfpUrl } : {}),
      proofHash: proof.proofHash,
      proof_hash: proof.proofHash,
      signature: proof.signature,
      nonce: proof.nonce,
      issuedAt: proof.issuedAt,
      issued_at: proof.issuedAt,
      version: proof.version,
      verifiedAt: proof.verifiedAt,
      ...(proof.repoCount !== undefined ? { repoCount: proof.repoCount } : {}),
      ...(proof.commitCount !== undefined ? { commitCount: proof.commitCount } : {}),
      ...(proof.followerCount !== undefined
        ? { followerCount: proof.followerCount }
        : {}),
      ...(proof.serverCount !== undefined ? { serverCount: proof.serverCount } : {}),
    })),
    queriedAt: new Date().toISOString(),
  });

  return withPublicCors(response, "GET, OPTIONS");
}
