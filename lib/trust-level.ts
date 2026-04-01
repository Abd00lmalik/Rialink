import type { Platform, ProofRecord } from "@/lib/types";

export type TrustLevel = "high" | "medium" | "low" | "none";

export function deriveTrustLevelFromCount(totalVerified: number): TrustLevel {
  if (totalVerified >= 3) return "high";
  if (totalVerified >= 2) return "medium";
  if (totalVerified >= 1) return "low";
  return "none";
}

export function deriveTrustLevel(proofs: ProofRecord[]): TrustLevel {
  const uniquePlatforms = Array.from(
    new Set(
      proofs
        .filter((proof) => proof.verified !== false)
        .map((proof) => proof.platform)
    )
  ) as Platform[];
  return deriveTrustLevelFromCount(uniquePlatforms.length);
}
