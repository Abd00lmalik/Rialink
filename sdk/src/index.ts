import type {
  RialinkConfig,
  VerificationResponse,
  IdentityState,
  PolicyRequirement,
  PolicyEvaluation,
  TrustLevel,
  Platform,
  ProofRecord,
} from "./types.js";
import { fetchVerification, deriveTrustLevel } from "./verify.js";
import { evaluatePolicy, checkPolicy } from "./policy.js";
import { buildIdentity, formatIdentity } from "./identity.js";

/**
 * Rialink SDK — typed client for Rialink identity on Rialo.
 *
 * @example
 * ```ts
 * import { Rialink } from "@rialink/sdk";
 *
 * const rialink = new Rialink();
 *
 * // Verify a wallet
 * const result = await rialink.verify("wallet_address");
 * console.log(result.trustLevel);
 *
 * // Check policy
 * const pass = rialink.checkPolicy(result, [
 *   { platform: "github", minRepos: 5 },
 *   { trustLevel: "medium" },
 * ]);
 * ```
 */
export class Rialink {
  private baseUrl: string;
  private rpcUrl: string;
  private chain: string;

  constructor(config: RialinkConfig = {}) {
    this.baseUrl = config.baseUrl || "https://rialink.vercel.app";
    this.rpcUrl = config.rpcUrl || "https://devnet.rialo.io:4101";
    this.chain = config.chain || "rialo-devnet";
  }

  /**
   * Fetch wallet verification from the Rialink REST API.
   *
   * @param wallet - Solana wallet address (base58, 32-44 chars)
   * @returns full verification response with proofs and trust level
   */
  async verify(wallet: string): Promise<VerificationResponse> {
    return fetchVerification(wallet, this.baseUrl);
  }

  /**
   * Get trust level only (lightweight check).
   */
  async getTrustLevel(wallet: string): Promise<TrustLevel> {
    const result = await this.verify(wallet);
    return result.trustLevel;
  }

  /**
   * Get full identity state.
   */
  async getIdentity(wallet: string): Promise<IdentityState> {
    const verification = await this.verify(wallet);
    return buildIdentity({
      wallet: verification.wallet,
      trustLevel: verification.trustLevel,
      verifiedPlatforms: verification.verifiedPlatforms,
      totalVerified: verification.totalVerified,
      proofs: verification.proofs,
      chain: verification.chain,
      explorerUrl: verification.explorerUrl,
    });
  }

  /**
   * Evaluate policy requirements against a wallet.
   */
  evaluatePolicy(
    verification: VerificationResponse,
    requirements: PolicyRequirement[]
  ): PolicyEvaluation {
    return evaluatePolicy(verification, requirements);
  }

  /**
   * Quick policy check — returns true/false.
   */
  checkPolicy(
    verification: VerificationResponse,
    requirements: PolicyRequirement[]
  ): boolean {
    return checkPolicy(verification, requirements);
  }

  /**
   * List verified platforms for a wallet.
   */
  async getPlatforms(wallet: string): Promise<Platform[]> {
    const result = await this.verify(wallet);
    return result.verifiedPlatforms;
  }

  /**
   * Get verification proofs for a specific platform.
   */
  async getProofsForPlatform(
    wallet: string,
    platform: Platform
  ): Promise<ProofRecord[]> {
    const result = await this.verify(wallet);
    return result.proofs.filter((p) => p.platform === platform);
  }

  /**
   * Check if wallet is anchored on-chain.
   */
  async isAnchored(wallet: string): Promise<boolean> {
    const result = await this.verify(wallet);
    return result.anchoredProofs > 0;
  }

  /**
   * Format identity for display.
   */
  formatIdentity(identity: IdentityState): string {
    return formatIdentity(identity);
  }
}

// ─── Re-exports ─────────────────────────────────────────────────

export { fetchVerification, deriveTrustLevel } from "./verify.js";
export { evaluatePolicy, checkPolicy } from "./policy.js";
export { buildIdentity, formatIdentity } from "./identity.js";
export type {
  RialinkConfig,
  VerificationResponse,
  IdentityState,
  PolicyRequirement,
  PolicyEvaluation,
  TrustLevel,
  Platform,
  ProofRecord,
} from "./types.js";
