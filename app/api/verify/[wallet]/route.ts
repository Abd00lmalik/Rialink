import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Platform = "github" | "discord" | "farcaster";

interface StoredProofRow {
  platform: Platform;
  username: string;
  fullName?: string;
  proofHash: string;
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
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function withCors(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

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

function formatProofHash(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const clean = raw.replace(/^0x/i, "");
  if (clean.length <= 10) return `0x${clean}`;
  return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function deriveTrustLevel(totalVerified: number): "high" | "medium" | "low" | "none" {
  if (totalVerified >= 3) return "high";
  if (totalVerified >= 2) return "medium";
  if (totalVerified >= 1) return "low";
  return "none";
}

function normalizeProofRow(row: unknown): StoredProofRow | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as Record<string, unknown>;

  const platformValue = String(obj.platform || "").trim().toLowerCase();
  if (!isPlatform(platformValue)) return null;

  const usernameRaw = String(obj.username || obj.maskedUsername || "").trim();
  const username =
    usernameRaw ||
    String(obj.userId || obj.user_id || `${platformValue}:unknown`).trim();
  const fullName = String(obj.fullName || obj.full_name || "").trim();
  const proofHash = String(obj.proofHash || obj.proof_hash || "").trim();
  const verifiedAt = String(obj.verifiedAt || obj.verified_at || "").trim();
  const pfpUrl = String(obj.pfpUrl || obj.pfp_url || "").trim();

  return {
    platform: platformValue,
    username,
    ...(fullName ? { fullName } : {}),
    proofHash,
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
      .map((row) => normalizeProofRow(row))
      .filter((row): row is StoredProofRow => !!row);
  } catch {
    return [];
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(
  _req: NextRequest,
  context: { params: { wallet: string } }
) {
  const wallet = String(context.params.wallet || "").trim();
  if (!wallet) {
    return withCors(
      NextResponse.json(
        { error: "wallet is required", queriedAt: new Date().toISOString() },
        { status: 400 }
      )
    );
  }

  const allProofs = await readProofs(wallet);
  const proofs = allProofs
    .filter((proof) => proof.verified)
    .sort(
      (a, b) =>
        PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
    );

  const verifiedPlatforms = PLATFORM_ORDER.filter((platform) =>
    proofs.some((proof) => proof.platform === platform)
  );
  const totalVerified = verifiedPlatforms.length;
  const trustLevel = deriveTrustLevel(totalVerified);

  const response = NextResponse.json({
    wallet,
    valid: totalVerified > 0,
    trustLevel,
    verifiedPlatforms,
    totalVerified,
    maxPossible: MAX_POSSIBLE,
    proofs: proofs.map((proof) => ({
      platform: proof.platform,
      username: proof.username,
      ...(proof.fullName ? { fullName: proof.fullName } : {}),
      ...(proof.pfpUrl ? { pfpUrl: proof.pfpUrl } : {}),
      proofHash: formatProofHash(proof.proofHash),
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

  return withCors(response);
}
