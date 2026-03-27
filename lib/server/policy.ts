import { createHmac, timingSafeEqual } from "crypto";
import { getProofs, getIdentityRoot } from "@/lib/server/proof-storage";
import { cardIdFromWallet } from "@/lib/card-id";
import type { Platform, ProofRecord } from "@/lib/types";
import type { PolicyTokenPayload, VerificationPolicy } from "@/lib/policy";

export interface PolicyEvaluation {
  eligible: boolean;
  reasons: string[];
  platforms: Platform[];
  proofs: ProofRecord[];
  identityRoot: string | null;
  cardId: string;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function getSigningSecret(): string {
  const secret = process.env.POLICY_SIGNING_SECRET;
  if (!secret) {
    throw new Error("POLICY_SIGNING_SECRET is not set");
  }
  return secret;
}

function normalizePolicy(policy: VerificationPolicy): VerificationPolicy {
  return {
    id: policy.id,
    name: policy.name,
    requirePlatforms: policy.requirePlatforms || [],
    minPlatforms: policy.minPlatforms,
    maxAgeDays: policy.maxAgeDays,
  };
}

function filterByAge(proofs: ProofRecord[], maxAgeDays?: number): ProofRecord[] {
  if (!maxAgeDays || maxAgeDays <= 0) return proofs;
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return proofs.filter((proof) => {
    const ts = Date.parse(proof.verifiedAt);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export async function evaluatePolicy(wallet: string, policy: VerificationPolicy): Promise<PolicyEvaluation> {
  const proofs = await getProofs(wallet);
  const identityRoot = await getIdentityRoot(wallet);
  const cardId = cardIdFromWallet(wallet);

  const normalized = normalizePolicy(policy);
  const validProofs = filterByAge(proofs, normalized.maxAgeDays);
  const platforms = Array.from(new Set(validProofs.map((p) => p.platform)));
  const reasons: string[] = [];

  if (normalized.requirePlatforms && normalized.requirePlatforms.length > 0) {
    const missing = normalized.requirePlatforms.filter((p) => !platforms.includes(p));
    if (missing.length > 0) {
      reasons.push(`Missing required platforms: ${missing.join(", ")}`);
    }
  }

  if (typeof normalized.minPlatforms === "number") {
    if (platforms.length < normalized.minPlatforms) {
      reasons.push(`Requires at least ${normalized.minPlatforms} verified platforms`);
    }
  }

  if (!normalized.requirePlatforms?.length && normalized.minPlatforms === undefined) {
    if (platforms.length === 0) {
      reasons.push("No verified platforms found");
    }
  }

  if (normalized.maxAgeDays) {
    if (validProofs.length < proofs.length) {
      reasons.push(`Some proofs are older than ${normalized.maxAgeDays} days`);
    }
  }

  const eligible = reasons.length === 0;

  return {
    eligible,
    reasons,
    platforms,
    proofs: validProofs,
    identityRoot,
    cardId,
  };
}

export function createPolicyToken(payload: PolicyTokenPayload): string {
  const secret = getSigningSecret();
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64");
  const signatureUrl = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${body}.${signatureUrl}`;
}

export function verifyPolicyToken(token: string): { valid: boolean; payload?: PolicyTokenPayload; error?: string } {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return { valid: false, error: "Malformed token" };

    const secret = getSigningSecret();
    const expected = createHmac("sha256", secret).update(body).digest("base64");
    const expectedUrl = expected.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedUrl);
    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload = JSON.parse(base64UrlDecode(body)) as PolicyTokenPayload;
    if (!payload || !payload.wallet) return { valid: false, error: "Invalid payload" };
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Token verification failed" };
  }
}
