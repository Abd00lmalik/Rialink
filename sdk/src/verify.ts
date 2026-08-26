import type { VerificationResponse, ProofRecord, TrustLevel, Platform } from "./types.js";

const DEFAULT_BASE_URL = "https://rialink.vercel.app";
const DEFAULT_RPC_URL = "https://devnet.rialo.io:4101";

/**
 * Fetch wallet verification from Rialink REST API.
 */
export async function fetchVerification(
  wallet: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<VerificationResponse> {
  const res = await fetch(`${baseUrl}/api/verify/${wallet}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      `verify_failed: ${res.status} ${body?.error || res.statusText}`
    );
  }
  return res.json();
}

/**
 * Compute trust level from verified count.
 */
export function deriveTrustLevel(totalVerified: number): TrustLevel {
  if (totalVerified >= 3) return "high";
  if (totalVerified >= 2) return "medium";
  if (totalVerified >= 1) return "low";
  return "none";
}

/**
 * Normalize a proof record from REST API response.
 */
export function normalizeProof(raw: Record<string, unknown>): ProofRecord {
  const platform = String(raw.platform || "").trim().toLowerCase() as Platform;
  return {
    wallet: String(raw.wallet || ""),
    platform,
    userId: String(raw.userId || raw.user_id || ""),
    username: String(raw.username || ""),
    ...(raw.fullName ? { fullName: String(raw.fullName) } : {}),
    proofHash: String(raw.proofHash || raw.proof_hash || ""),
    signature: String(raw.signature || ""),
    nonce: String(raw.nonce || "legacy"),
    issuedAt: Number(raw.issuedAt || raw.issued_at || 0),
    version: (raw.version === "v2" ? "v2" : "v1") as "v1" | "v2",
    verifiedAt: String(raw.verifiedAt || ""),
    verified: raw.verified !== false,
    ...(raw.pfpUrl ? { pfpUrl: String(raw.pfpUrl) } : {}),
    ...(raw.chain ? { chain: String(raw.chain) } : {}),
    ...(raw.txSignature ? { txSignature: String(raw.txSignature) } : {}),
    ...(raw.explorerUrl ? { explorerUrl: String(raw.explorerUrl) } : {}),
    ...(raw.anchoredAt ? { anchoredAt: String(raw.anchoredAt) } : {}),
    ...(raw.repoCount !== undefined ? { repoCount: Number(raw.repoCount) } : {}),
    ...(raw.commitCount !== undefined ? { commitCount: Number(raw.commitCount) } : {}),
    ...(raw.followerCount !== undefined ? { followerCount: Number(raw.followerCount) } : {}),
    ...(raw.serverCount !== undefined ? { serverCount: Number(raw.serverCount) } : {}),
  };
}
