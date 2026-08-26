// ─── Platform & Trust ───────────────────────────────────────────

export type Platform = "github" | "discord" | "farcaster";
export type TrustLevel = "high" | "medium" | "low" | "none";

// ─── Proof Record ───────────────────────────────────────────────

export interface ProofRecord {
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
  chain?: string;
  txSignature?: string;
  explorerUrl?: string;
  anchoredAt?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
}

// ─── Verification Response ──────────────────────────────────────

export interface VerificationResponse {
  wallet: string;
  valid: boolean;
  trustLevel: TrustLevel;
  verifiedPlatforms: Platform[];
  totalVerified: number;
  anchoredProofs: number;
  maxPossible: number;
  proofs: ProofRecord[];
  chain?: string;
  explorerUrl?: string;
  queriedAt: string;
}

// ─── Identity ───────────────────────────────────────────────────

export interface IdentityState {
  wallet: string;
  trustLevel: TrustLevel;
  verifiedPlatforms: Platform[];
  totalVerified: number;
  proofs: ProofRecord[];
  chain: string;
  explorerUrl: string | null;
  identityRoot: string | null;
  accountAge: number | null;
  lastVerified: string | null;
}

// ─── Policy ─────────────────────────────────────────────────────

export interface PolicyRequirement {
  platform?: Platform;
  minRepos?: number;
  minFollowers?: number;
  minAccountAgeDays?: number;
  requiresAnchored?: boolean;
  trustLevel?: TrustLevel;
}

export interface PolicyEvaluation {
  wallet: string;
  pass: boolean;
  requirements: PolicyRequirement[];
  results: Array<{
    requirement: PolicyRequirement;
    met: boolean;
    reason: string;
  }>;
}

// ─── SDK Config ─────────────────────────────────────────────────

export interface RialinkConfig {
  baseUrl?: string;
  rpcUrl?: string;
  chain?: string;
}
