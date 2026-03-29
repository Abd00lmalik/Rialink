import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Platform = "github" | "discord" | "farcaster";

interface StoredProofRow {
  platform: Platform;
  verified: boolean;
  verifiedAt: string;
  repoCount?: number;
}

interface PolicyRequirements {
  platforms?: Platform[];
  minPlatforms?: number;
  minRepoCount?: number;
  maxProofAgeDays?: number;
}

interface PolicyCheckResult {
  requirement: "platforms" | "minPlatforms" | "minRepoCount" | "maxProofAgeDays";
  required: string[] | number;
  actual?: string[] | number;
  passed: boolean;
}

interface AccessTokenPayload {
  wallet: string;
  policy: string;
  issuedAt: string;
  expiresAt: string;
  checks: PolicyCheckResult[];
}

const PLATFORM_ORDER: Platform[] = ["github", "discord", "farcaster"];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_TTL_MS = ONE_DAY_MS;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const DEFAULT_POLICY_REQUIREMENTS: Record<string, PolicyRequirements> = {
  "dao-grant": { minPlatforms: 2, maxProofAgeDays: 180 },
  bounty: { minPlatforms: 1, platforms: ["github"] },
  hackathon: { minPlatforms: 1, maxProofAgeDays: 365 },
  airdrop: { minPlatforms: 2, maxProofAgeDays: 90 },
};

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

function deriveTrustLevel(totalVerified: number): "high" | "medium" | "low" | "none" {
  if (totalVerified >= 3) return "high";
  if (totalVerified >= 2) return "medium";
  if (totalVerified >= 1) return "low";
  return "none";
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(encodedPayload: string): string {
  const secret = process.env.PROOF_SECRET || "verifyme-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("hex");
}

function createAccessToken(payload: AccessTokenPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `vm_${encodedPayload}.${signature}`;
}

function normalizeProofRow(row: unknown): StoredProofRow | null {
  if (!row || typeof row !== "object") return null;
  const obj = row as Record<string, unknown>;

  const platformValue = String(obj.platform || "").trim().toLowerCase();
  if (!isPlatform(platformValue)) return null;

  return {
    platform: platformValue,
    verified: obj.verified !== false,
    verifiedAt: String(obj.verifiedAt || obj.verified_at || "").trim(),
    ...(toNumberOrUndefined(obj.repoCount) !== undefined
      ? { repoCount: toNumberOrUndefined(obj.repoCount) }
      : {}),
  };
}

async function readProofs(wallet: string): Promise<StoredProofRow[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const rows = (await redis.lrange<unknown>(`proofs:${wallet}`, 0, -1)) || [];
    return rows
      .map((row) => normalizeProofRow(row))
      .filter((row): row is StoredProofRow => !!row);
  } catch {
    return [];
  }
}

function normalizeRequirements(input: unknown): PolicyRequirements {
  if (!input || typeof input !== "object") return {};
  const row = input as Record<string, unknown>;

  const platformsInput = Array.isArray(row.platforms)
    ? row.platforms
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item): item is Platform => isPlatform(item))
    : undefined;

  return {
    ...(platformsInput && platformsInput.length > 0
      ? { platforms: Array.from(new Set(platformsInput)) }
      : {}),
    ...(toNumberOrUndefined(row.minPlatforms) !== undefined
      ? { minPlatforms: toNumberOrUndefined(row.minPlatforms) }
      : {}),
    ...(toNumberOrUndefined(row.minRepoCount) !== undefined
      ? { minRepoCount: toNumberOrUndefined(row.minRepoCount) }
      : {}),
    ...(toNumberOrUndefined(row.maxProofAgeDays) !== undefined
      ? { maxProofAgeDays: toNumberOrUndefined(row.maxProofAgeDays) }
      : {}),
  };
}

function mergeRequirements(
  policy: string,
  overrides: PolicyRequirements
): PolicyRequirements {
  const defaults = DEFAULT_POLICY_REQUIREMENTS[policy] || {};
  return {
    ...defaults,
    ...overrides,
  };
}

function getVerifiedPlatforms(proofs: StoredProofRow[]): Platform[] {
  const verifiedSet = new Set(
    proofs.filter((proof) => proof.verified).map((proof) => proof.platform)
  );
  return PLATFORM_ORDER.filter((platform) => verifiedSet.has(platform));
}

function evaluateChecks(
  proofs: StoredProofRow[],
  requirements: PolicyRequirements
): PolicyCheckResult[] {
  const checks: PolicyCheckResult[] = [];
  const verifiedProofs = proofs.filter((proof) => proof.verified);
  const verifiedPlatforms = getVerifiedPlatforms(verifiedProofs);

  if (requirements.platforms && requirements.platforms.length > 0) {
    const passed = requirements.platforms.every((platform) =>
      verifiedPlatforms.includes(platform)
    );
    checks.push({
      requirement: "platforms",
      required: requirements.platforms,
      actual: verifiedPlatforms,
      passed,
    });
  }

  if (typeof requirements.minPlatforms === "number") {
    checks.push({
      requirement: "minPlatforms",
      required: requirements.minPlatforms,
      actual: verifiedPlatforms.length,
      passed: verifiedPlatforms.length >= requirements.minPlatforms,
    });
  }

  if (typeof requirements.minRepoCount === "number") {
    const githubProof = verifiedProofs.find((proof) => proof.platform === "github");
    const repoCount = Number(githubProof?.repoCount || 0);
    checks.push({
      requirement: "minRepoCount",
      required: requirements.minRepoCount,
      actual: repoCount,
      passed: repoCount >= requirements.minRepoCount,
    });
  }

  if (typeof requirements.maxProofAgeDays === "number") {
    const maxAgeMs = requirements.maxProofAgeDays * ONE_DAY_MS;
    const now = Date.now();
    const allRecent =
      verifiedProofs.length > 0 &&
      verifiedProofs.every((proof) => {
        const ts = Date.parse(proof.verifiedAt);
        return Number.isFinite(ts) && now - ts <= maxAgeMs;
      });
    checks.push({
      requirement: "maxProofAgeDays",
      required: requirements.maxProofAgeDays,
      passed: allRecent,
    });
  }

  return checks;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const wallet = String(body?.wallet || "").trim();
  if (!wallet) {
    return withCors(
      NextResponse.json({ error: "wallet is required" }, { status: 400 })
    );
  }

  const policy = String(body?.policy || "custom").trim().toLowerCase();
  const requirements = mergeRequirements(
    policy,
    normalizeRequirements(body?.requirements)
  );

  const proofs = await readProofs(wallet);
  const verifiedPlatforms = getVerifiedPlatforms(proofs);
  const trustLevel = deriveTrustLevel(verifiedPlatforms.length);
  const checks = evaluateChecks(proofs, requirements);
  const passed = checks.every((check) => check.passed);

  const evaluatedAt = new Date().toISOString();
  let accessToken: string | undefined;
  if (passed) {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + TOKEN_TTL_MS);
    accessToken = createAccessToken({
      wallet,
      policy,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      checks,
    });
  }

  const response = NextResponse.json({
    wallet,
    policy,
    passed,
    trustLevel,
    evaluatedAt,
    checks,
    ...(accessToken ? { accessToken } : {}),
  });

  return withCors(response);
}
