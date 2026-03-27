import type { Platform } from "@/lib/types";

export interface VerificationPolicy {
  id?: string;
  name?: string;
  requirePlatforms?: Platform[];
  minPlatforms?: number;
  maxAgeDays?: number;
}

export interface PolicyTokenPayload {
  wallet: string;
  policy: VerificationPolicy;
  platforms: Platform[];
  identityRoot: string | null;
  issuedAt: number;
  expiresAt: number;
}

export const POLICY_PRESETS: Record<
  string,
  { name: string; policy: VerificationPolicy }
> = {
  airdrop: {
    name: "Airdrop (2+ platforms)",
    policy: { minPlatforms: 2 },
  },
  dao: {
    name: "DAO gate (GitHub + Farcaster)",
    policy: { requirePlatforms: ["github", "farcaster"] },
  },
  bounty: {
    name: "Bounty (GitHub required)",
    policy: { requirePlatforms: ["github"] },
  },
  moderation: {
    name: "Moderation (any verified)",
    policy: { minPlatforms: 1 },
  },
};
