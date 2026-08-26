import type {
  PolicyRequirement,
  PolicyEvaluation,
  VerificationResponse,
  TrustLevel,
} from "./types.js";

/**
 * Evaluate policy requirements against a wallet's verification state.
 *
 * @param verification - result from fetchVerification()
 * @param requirements - array of policy checks
 * @returns evaluation with per-requirement pass/fail
 */
export function evaluatePolicy(
  verification: VerificationResponse,
  requirements: PolicyRequirement[]
): PolicyEvaluation {
  const results = requirements.map((req) => {
    // Trust level check
    if (req.trustLevel) {
      const levelOrder: Record<TrustLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };
      if (levelOrder[verification.trustLevel] < levelOrder[req.trustLevel]) {
        return {
          requirement: req,
          met: false,
          reason: `trust level ${verification.trustLevel} < required ${req.trustLevel}`,
        };
      }
    }

    // Platform-specific checks
    const proof = req.platform
      ? verification.proofs.find((p) => p.platform === req.platform)
      : undefined;

    if (req.platform && !proof) {
      return {
        requirement: req,
        met: false,
        reason: `platform ${req.platform} not verified`,
      };
    }

    // Repo count
    if (req.minRepos !== undefined && proof && proof.repoCount !== undefined) {
      if (proof.repoCount < req.minRepos) {
        return {
          requirement: req,
          met: false,
          reason: `repo count ${proof.repoCount} < required ${req.minRepos}`,
        };
      }
    }

    // Follower count
    if (req.minFollowers !== undefined && proof && proof.followerCount !== undefined) {
      if (proof.followerCount < req.minFollowers) {
        return {
          requirement: req,
          met: false,
          reason: `follower count ${proof.followerCount} < required ${req.minFollowers}`,
        };
      }
    }

    // Account age (in days)
    if (req.minAccountAgeDays !== undefined && proof) {
      const accountAgeMs = proof.issuedAt ? Date.now() - proof.issuedAt : 0;
      const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
      if (accountAgeDays < req.minAccountAgeDays) {
        return {
          requirement: req,
          met: false,
          reason: `account age ${accountAgeDays}d < required ${req.minAccountAgeDays}d`,
        };
      }
    }

    // Anchored check
    if (req.requiresAnchored && proof) {
      if (!proof.chain || !proof.txSignature) {
        return {
          requirement: req,
          met: false,
          reason: "proof not anchored on-chain",
        };
      }
    }

    return { requirement: req, met: true, reason: "passed" };
  });

  return {
    wallet: verification.wallet,
    pass: results.every((r) => r.met),
    requirements,
    results,
  };
}

/**
 * Check if a wallet passes all requirements.
 */
export function checkPolicy(
  verification: VerificationResponse,
  requirements: PolicyRequirement[]
): boolean {
  return evaluatePolicy(verification, requirements).pass;
}
