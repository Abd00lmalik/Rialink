import { createHmac, timingSafeEqual } from "crypto";
import { getProofs } from "@/lib/server/proof-storage";
import { deriveTrustLevelFromCount } from "@/lib/trust-level";
import type { Platform } from "@/lib/types";

export interface PolicyRequirements {
  platforms?: Platform[];
  minPlatforms?: number;
  minRepoCount?: number;
  maxProofAgeDays?: number;
}

export interface PolicyCheckResult {
  requirement: "platforms" | "minPlatforms" | "minRepoCount" | "maxProofAgeDays";
  required: string[] | number;
  actual?: string[] | number;
  passed: boolean;
}

export interface PolicyEvaluation {
  wallet: string;
  policy: string;
  passed: boolean;
  trustLevel: "high" | "medium" | "low" | "none";
  evaluatedAt: string;
  checks: PolicyCheckResult[];
  verifiedPlatforms: Platform[];
}

export interface AccessTokenPayload {
  wallet: string;
  policy: string;
  issuedAt: string;
  expiresAt: string;
  checks: PolicyCheckResult[];
}

export type VerifyPolicyTokenResult =
  | { valid: true; payload: AccessTokenPayload }
  | {
      valid: false;
      errorCode:
        | "malformed_token"
        | "invalid_signature"
        | "invalid_payload"
        | "expired_token";
      error: string;
    };

const PLATFORM_ORDER: Platform[] = ["github", "discord", "farcaster"];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_POLICY_REQUIREMENTS: Record<string, PolicyRequirements> = {
  "dao-grant": { minPlatforms: 2, maxProofAgeDays: 180 },
  bounty: { minPlatforms: 1, platforms: ["github"] },
  hackathon: { minPlatforms: 1, maxProofAgeDays: 365 },
  airdrop: { minPlatforms: 2, maxProofAgeDays: 90 },
};

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function isPlatform(value: string): value is Platform {
  return PLATFORM_ORDER.includes(value as Platform);
}

export function normalizePolicyRequirements(input: unknown): PolicyRequirements {
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

export function mergePolicyRequirements(
  policy: string,
  overrides: PolicyRequirements
): PolicyRequirements {
  const defaults = DEFAULT_POLICY_REQUIREMENTS[policy] || {};
  return {
    ...defaults,
    ...overrides,
  };
}

function evaluateChecks(
  proofs: Awaited<ReturnType<typeof getProofs>>,
  requirements: PolicyRequirements
): PolicyCheckResult[] {
  const checks: PolicyCheckResult[] = [];
  const verifiedProofs = proofs.filter((proof) => proof.verified);
  const verifiedSet = new Set(verifiedProofs.map((proof) => proof.platform));
  const verifiedPlatforms = PLATFORM_ORDER.filter((platform) =>
    verifiedSet.has(platform)
  );

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

export async function evaluateWalletPolicy(args: {
  wallet: string;
  policy: string;
  requirements: PolicyRequirements;
}): Promise<PolicyEvaluation> {
  const proofs = await getProofs(args.wallet);
  const verifiedSet = new Set(
    proofs.filter((proof) => proof.verified).map((proof) => proof.platform)
  );
  const verifiedPlatforms = PLATFORM_ORDER.filter((platform) =>
    verifiedSet.has(platform)
  );
  const checks = evaluateChecks(proofs, args.requirements);
  const passed = checks.every((check) => check.passed);

  return {
    wallet: args.wallet,
    policy: args.policy,
    passed,
    trustLevel: deriveTrustLevelFromCount(verifiedPlatforms.length),
    evaluatedAt: new Date().toISOString(),
    checks,
    verifiedPlatforms,
  };
}

function getPolicySigningSecret(): string {
  const secret = String(process.env.POLICY_SIGNING_SECRET || "").trim();
  if (!secret) {
    throw new Error("Missing POLICY_SIGNING_SECRET");
  }
  return secret;
}

function parsePolicyTokenTtlSeconds(): number {
  const raw = Number(process.env.POLICY_TOKEN_TTL_SECONDS || 86400);
  if (!Number.isFinite(raw)) return 86400;
  const clamped = Math.min(7 * 24 * 60 * 60, Math.max(60, Math.floor(raw)));
  return clamped;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getPolicySigningSecret())
    .update(encodedPayload)
    .digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export function createPolicyAccessToken(args: {
  wallet: string;
  policy: string;
  checks: PolicyCheckResult[];
}): string {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + parsePolicyTokenTtlSeconds() * 1000);
  const payload: AccessTokenPayload = {
    wallet: args.wallet,
    policy: args.policy,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    checks: args.checks,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `vm_${encodedPayload}.${signature}`;
}

export function verifyPolicyAccessToken(accessToken: string): VerifyPolicyTokenResult {
  if (!accessToken.startsWith("vm_")) {
    return {
      valid: false,
      errorCode: "malformed_token",
      error: "Malformed token",
    };
  }

  const tokenBody = accessToken.slice(3);
  const parts = tokenBody.split(".");
  if (parts.length !== 2) {
    return {
      valid: false,
      errorCode: "malformed_token",
      error: "Malformed token",
    };
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return {
      valid: false,
      errorCode: "malformed_token",
      error: "Malformed token",
    };
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqualHex(signature, expectedSignature)) {
    return {
      valid: false,
      errorCode: "invalid_signature",
      error: "Invalid signature",
    };
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as AccessTokenPayload;
    if (
      !parsed ||
      typeof parsed.wallet !== "string" ||
      typeof parsed.policy !== "string" ||
      typeof parsed.issuedAt !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      !Array.isArray(parsed.checks)
    ) {
      return {
        valid: false,
        errorCode: "invalid_payload",
        error: "Invalid payload",
      };
    }

    const expiresAtTs = Date.parse(parsed.expiresAt);
    if (!Number.isFinite(expiresAtTs)) {
      return {
        valid: false,
        errorCode: "invalid_payload",
        error: "Invalid payload",
      };
    }
    if (Date.now() > expiresAtTs) {
      return {
        valid: false,
        errorCode: "expired_token",
        error: "Token expired",
      };
    }

    return { valid: true, payload: parsed };
  } catch {
    return {
      valid: false,
      errorCode: "invalid_payload",
      error: "Invalid payload",
    };
  }
}
