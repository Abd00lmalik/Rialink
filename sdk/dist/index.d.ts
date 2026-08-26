type Platform = "github" | "discord" | "farcaster";
type TrustLevel = "high" | "medium" | "low" | "none";
interface ProofRecord {
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
interface VerificationResponse {
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
interface IdentityState {
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
interface PolicyRequirement {
    platform?: Platform;
    minRepos?: number;
    minFollowers?: number;
    minAccountAgeDays?: number;
    requiresAnchored?: boolean;
    trustLevel?: TrustLevel;
}
interface PolicyEvaluation {
    wallet: string;
    pass: boolean;
    requirements: PolicyRequirement[];
    results: Array<{
        requirement: PolicyRequirement;
        met: boolean;
        reason: string;
    }>;
}
interface RialinkConfig {
    baseUrl?: string;
    rpcUrl?: string;
    chain?: string;
}

/**
 * Fetch wallet verification from Rialink REST API.
 */
declare function fetchVerification(wallet: string, baseUrl?: string): Promise<VerificationResponse>;
/**
 * Compute trust level from verified count.
 */
declare function deriveTrustLevel(totalVerified: number): TrustLevel;

/**
 * Evaluate policy requirements against a wallet's verification state.
 *
 * @param verification - result from fetchVerification()
 * @param requirements - array of policy checks
 * @returns evaluation with per-requirement pass/fail
 */
declare function evaluatePolicy(verification: VerificationResponse, requirements: PolicyRequirement[]): PolicyEvaluation;
/**
 * Check if a wallet passes all requirements.
 */
declare function checkPolicy(verification: VerificationResponse, requirements: PolicyRequirement[]): boolean;

/**
 * Build identity state from verification response data.
 * Merges on-chain and off-chain information.
 */
declare function buildIdentity(data: {
    wallet: string;
    trustLevel: TrustLevel;
    verifiedPlatforms: Platform[];
    totalVerified: number;
    proofs: ProofRecord[];
    chain?: string;
    explorerUrl?: string;
    identityRoot?: string | null;
}): IdentityState;
/**
 * Format identity for display.
 */
declare function formatIdentity(identity: IdentityState): string;

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
declare class Rialink {
    private baseUrl;
    private rpcUrl;
    private chain;
    constructor(config?: RialinkConfig);
    /**
     * Fetch wallet verification from the Rialink REST API.
     *
     * @param wallet - Solana wallet address (base58, 32-44 chars)
     * @returns full verification response with proofs and trust level
     */
    verify(wallet: string): Promise<VerificationResponse>;
    /**
     * Get trust level only (lightweight check).
     */
    getTrustLevel(wallet: string): Promise<TrustLevel>;
    /**
     * Get full identity state.
     */
    getIdentity(wallet: string): Promise<IdentityState>;
    /**
     * Evaluate policy requirements against a wallet.
     */
    evaluatePolicy(verification: VerificationResponse, requirements: PolicyRequirement[]): PolicyEvaluation;
    /**
     * Quick policy check — returns true/false.
     */
    checkPolicy(verification: VerificationResponse, requirements: PolicyRequirement[]): boolean;
    /**
     * List verified platforms for a wallet.
     */
    getPlatforms(wallet: string): Promise<Platform[]>;
    /**
     * Get verification proofs for a specific platform.
     */
    getProofsForPlatform(wallet: string, platform: Platform): Promise<ProofRecord[]>;
    /**
     * Check if wallet is anchored on-chain.
     */
    isAnchored(wallet: string): Promise<boolean>;
    /**
     * Format identity for display.
     */
    formatIdentity(identity: IdentityState): string;
}

export { type IdentityState, type Platform, type PolicyEvaluation, type PolicyRequirement, type ProofRecord, Rialink, type RialinkConfig, type TrustLevel, type VerificationResponse, buildIdentity, checkPolicy, deriveTrustLevel, evaluatePolicy, fetchVerification, formatIdentity };
