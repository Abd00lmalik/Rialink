import type { Platform, ProofRecord } from "@/lib/types";

export type TrustLevel = "low" | "medium" | "high";

const QUALITY_WEIGHT: Record<Platform, number> = {
  github: 3,
  farcaster: 3,
  discord: 2,
};

export function deriveTrustLevel(proofs: ProofRecord[]): TrustLevel {
  const active = proofs.filter((proof) => proof.verified !== false);
  if (active.length === 0) return "low";

  const uniquePlatforms = Array.from(
    new Set(active.map((proof) => proof.platform))
  ) as Platform[];
  const platformScore = uniquePlatforms.reduce(
    (sum, platform) => sum + QUALITY_WEIGHT[platform],
    0
  );

  // Trust score is intentionally simple and deterministic for integrators:
  // count of unique verified platforms + platform quality weight.
  const score = uniquePlatforms.length + platformScore;
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}
