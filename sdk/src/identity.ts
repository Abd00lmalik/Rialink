import type { IdentityState, Platform, TrustLevel, ProofRecord } from "./types.js";

const PLATFORM_ORDER: Platform[] = ["github", "discord", "farcaster"];

/**
 * Build identity state from verification response data.
 * Merges on-chain and off-chain information.
 */
export function buildIdentity(data: {
  wallet: string;
  trustLevel: TrustLevel;
  verifiedPlatforms: Platform[];
  totalVerified: number;
  proofs: ProofRecord[];
  chain?: string;
  explorerUrl?: string;
  identityRoot?: string | null;
}): IdentityState {
  const sortedProofs = [...data.proofs].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
  );

  const lastVerified = sortedProofs
    .filter((p) => p.verifiedAt)
    .sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime())[0]
    ?.verifiedAt || null;

  // Compute account age as the oldest proof's issue date
  const oldestProof = sortedProofs
    .filter((p) => p.issuedAt > 0)
    .sort((a, b) => a.issuedAt - b.issuedAt)[0];

  const accountAge = oldestProof
    ? Math.floor((Date.now() - oldestProof.issuedAt) / (1000 * 60 * 60 * 24))
    : null;

  return {
    wallet: data.wallet,
    trustLevel: data.trustLevel,
    verifiedPlatforms: data.verifiedPlatforms,
    totalVerified: data.totalVerified,
    proofs: sortedProofs,
    chain: data.chain || "rialo-devnet",
    explorerUrl: data.explorerUrl || null,
    identityRoot: data.identityRoot || null,
    accountAge,
    lastVerified,
  };
}

/**
 * Format identity for display.
 */
export function formatIdentity(identity: IdentityState): string {
  const lines = [
    `Wallet: ${identity.wallet}`,
    `Trust Level: ${identity.trustLevel}`,
    `Verified Platforms: ${identity.verifiedPlatforms.join(", ") || "none"}`,
    `Total Verified: ${identity.totalVerified}/3`,
    `Chain: ${identity.chain}`,
  ];
  if (identity.accountAge !== null) {
    lines.push(`Account Age: ${identity.accountAge} days`);
  }
  if (identity.identityRoot) {
    lines.push(`Identity Root: ${identity.identityRoot}`);
  }
  return lines.join("\n");
}
