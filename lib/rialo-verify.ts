/**
 * On-chain identity verifier for Rialo.
 *
 * Reads identity memo transactions from the Rialo chain and verifies
 * that a wallet's identity root is anchored. Optionally cross-references
 * with the Rialink REST API to resolve which platforms are verified.
 *
 * Two modes:
 *   - Pure chain: verifyOnChain(wallet) — confirms anchoring exists
 *   - Chain + API: verifyOnChain(wallet, rpcUrl, apiUrl) — also resolves platforms
 */

const ANCHOR_WALLET = "6b96D9tmtkrx2i4nc5tiaLr5pLbne4wenv3iTYe3Bp6r";
const MEMO_PREFIX = "rialink:v1|";
const DEFAULT_RPC = "https://devnet.rialo.io:4101";
const DEFAULT_API = "https://rialink.vercel.app";

type Platform = "github" | "discord" | "farcaster";
type TrustLevel = "high" | "medium" | "low" | "none";

interface AnchorMemo {
  action: "create" | "revoke";
  wallet: string;
  identityRoot: string;
}

interface OnChainProof {
  wallet: string;
  action: "create" | "revoke";
  identityRoot: string;
  txSignature: string;
  slot: number;
  timestamp: number;
}

interface OnChainVerification {
  wallet: string;
  valid: boolean;
  trustLevel: TrustLevel;
  verifiedPlatforms: Platform[];
  totalVerified: number;
  onChainProofs: OnChainProof[];
  identityRoot: string | null;
  explorerUrl: string | null;
  anchored: boolean;
  chainTimestamp: string;
  apiCrossRef?: {
    match: boolean;
    apiIdentityRoot: string | null;
    apiPlatforms: Platform[];
  };
}

// ─── Raw RPC helpers ────────────────────────────────────────────

async function rawRpc(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`rpc_http_${res.status}`);
  const payload = (await res.json()) as { result?: { value?: unknown; context?: unknown }; error?: { message?: string } };
  if (payload.error) throw new Error(`rpc_error: ${String(payload.error.message || "unknown").slice(0, 120)}`);
  const result = payload.result;
  if (result && typeof result === "object" && "value" in result) return result.value;
  return result;
}

// ─── Base58 decode ──────────────────────────────────────────────

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58decode(str: string): Uint8Array {
  let n = 0n;
  for (const c of str) {
    const i = B58_ALPHABET.indexOf(c);
    if (i < 0) throw new Error(`bad base58 char: ${c}`);
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n /= 256n;
  }
  for (const c of str) {
    if (c === "1") bytes.unshift(0);
    else break;
  }
  return new Uint8Array(bytes);
}

function b58decodeToStr(str: string): string {
  return Buffer.from(b58decode(str)).toString("utf8");
}

// ─── Memo decoder ───────────────────────────────────────────────

function decodeAnchorMemo(memoData: string): AnchorMemo | null {
  try {
    const text = b58decodeToStr(memoData);
    if (!text.startsWith(MEMO_PREFIX)) return null;
    const parts = text.slice(MEMO_PREFIX.length).split("|");
    if (parts.length !== 3) return null;
    const [action, wallet, identityRoot] = parts;
    if (action !== "create" && action !== "revoke") return null;
    if (!wallet || !identityRoot) return null;
    return { action, wallet, identityRoot };
  } catch {
    return null;
  }
}

// ─── Fetch anchor transactions for a wallet ─────────────────────

async function fetchAnchorTransactions(
  rpcUrl: string,
  targetWallet: string
): Promise<OnChainProof[]> {
  const sigsResult = (await rawRpc(rpcUrl, "getSignaturesForAddress", [
    { address: ANCHOR_WALLET, limit: 1000 },
  ])) as { signature: string; slot: number; blockTime?: number }[];

  if (!sigsResult || sigsResult.length === 0) return [];

  const proofs: OnChainProof[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < sigsResult.length; i += BATCH_SIZE) {
    const batch = sigsResult.slice(i, i + BATCH_SIZE);
    const txPromises = batch.map(async (sig) => {
      try {
        const tx = (await rawRpc(rpcUrl, "getTransaction", [
          { signature: sig.signature },
        ])) as {
          meta?: { err?: unknown };
          transaction?: {
            message?: { instructions?: { data?: string }[] };
          };
        };

        if (tx?.meta?.err) return null;
        const memoData = tx?.transaction?.message?.instructions?.[0]?.data;
        if (!memoData) return null;

        const memo = decodeAnchorMemo(memoData);
        if (!memo) return null;
        if (memo.wallet !== targetWallet) return null;

        return {
          wallet: memo.wallet,
          action: memo.action,
          identityRoot: memo.identityRoot,
          txSignature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime ? sig.blockTime : Date.now(),
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(txPromises);
    for (const r of results) {
      if (r) proofs.push(r);
    }
  }

  return proofs;
}

// ─── REST API cross-reference ───────────────────────────────────

interface ApiResponse {
  wallet: string;
  valid: boolean;
  trustLevel: TrustLevel;
  verifiedPlatforms: Platform[];
  totalVerified: number;
  proofs: Array<{
    platform: Platform;
    proofHash: string;
    [key: string]: unknown;
  }>;
  identityRoot?: string;
}

async function fetchApiVerification(
  apiUrl: string,
  wallet: string
): Promise<ApiResponse | null> {
  try {
    const res = await fetch(`${apiUrl}/api/verify/${wallet}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Compute identity root from API proof hashes ────────────────

function computeIdentityRootFromProofs(proofs: Array<{ proofHash: string }>): string | null {
  if (proofs.length === 0) return null;
  const crypto = require("crypto");
  const joined = proofs.map((p) => p.proofHash).sort().join(":");
  return crypto.createHash("sha256").update(joined).digest("hex").slice(0, 32);
}

// ─── Derive platforms from on-chain data + API ──────────────────

function resolveFromChainAndApi(
  proofs: OnChainProof[],
  apiData: ApiResponse | null
): {
  platforms: Platform[];
  identityRoot: string | null;
  latestProof: OnChainProof | null;
  apiCrossRef: OnChainVerification["apiCrossRef"];
} {
  // Get latest on-chain identity root
  const creates = proofs
    .filter((p) => p.action === "create")
    .sort((a, b) => b.timestamp - a.timestamp);

  const latestProof = creates[0] || null;
  const chainIdentityRoot = latestProof?.identityRoot || null;

  if (!apiData) {
    // No API data — pure chain mode, can't resolve platforms
    return { platforms: [], identityRoot: chainIdentityRoot, latestProof, apiCrossRef: undefined };
  }

  // Cross-reference: compare on-chain root with API-derived root
  const apiIdentityRoot = apiData.proofs.length > 0
    ? computeIdentityRootFromProofs(apiData.proofs)
    : null;

  const rootsMatch = chainIdentityRoot && apiIdentityRoot
    ? chainIdentityRoot === apiIdentityRoot
    : chainIdentityRoot === null; // if no chain root, treat as match

  return {
    platforms: apiData.verifiedPlatforms,
    identityRoot: chainIdentityRoot || apiIdentityRoot,
    latestProof,
    apiCrossRef: {
      match: rootsMatch,
      apiIdentityRoot,
      apiPlatforms: apiData.verifiedPlatforms,
    },
  };
}

// ─── Trust level derivation ─────────────────────────────────────

function deriveTrustLevel(verifiedCount: number): TrustLevel {
  if (verifiedCount >= 3) return "high";
  if (verifiedCount >= 2) return "medium";
  if (verifiedCount >= 1) return "low";
  return "none";
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Verify a wallet's identity on Rialo.
 *
 * Mode 1 — Pure chain (no apiUrl):
 *   Confirms identity root is anchored on-chain. Returns empty platforms
 *   since the memo format doesn't include platform info.
 *
 * Mode 2 — Chain + API (with apiUrl):
 *   Cross-references on-chain anchor with REST API data.
 *   Resolves platforms and verifies identity root consistency.
 *
 * @param wallet - The wallet address to verify
 * @param rpcUrl - Rialo RPC URL (defaults to devnet)
 * @param apiUrl - Rialink API URL (defaults to production). Pass null to skip API cross-ref.
 */
export async function verifyOnChain(
  wallet: string,
  rpcUrl: string = DEFAULT_RPC,
  apiUrl: string | null = DEFAULT_API
): Promise<OnChainVerification> {
  if (!wallet || wallet.length < 32) {
    return {
      wallet,
      valid: false,
      trustLevel: "none",
      verifiedPlatforms: [],
      totalVerified: 0,
      onChainProofs: [],
      identityRoot: null,
      explorerUrl: null,
      anchored: false,
      chainTimestamp: new Date().toISOString(),
    };
  }

  // Fetch on-chain memos
  const onChainProofs = await fetchAnchorTransactions(rpcUrl, wallet);

  // Optionally cross-reference with REST API
  let apiData: ApiResponse | null = null;
  if (apiUrl) {
    apiData = await fetchApiVerification(apiUrl, wallet);
  }

  const { platforms, identityRoot, latestProof, apiCrossRef } = resolveFromChainAndApi(onChainProofs, apiData);

  const explorerUrl = latestProof
    ? `https://devnet.rialoscan.org/tx/${latestProof.txSignature}`
    : null;

  const anchored = onChainProofs.some((p) => p.action === "create");
  const trustLevel = deriveTrustLevel(platforms.length);

  return {
    wallet,
    valid: anchored || platforms.length > 0,
    trustLevel,
    verifiedPlatforms: platforms,
    totalVerified: platforms.length,
    onChainProofs,
    identityRoot,
    explorerUrl,
    anchored,
    chainTimestamp: latestProof
      ? new Date(latestProof.timestamp).toISOString()
      : new Date().toISOString(),
    ...(apiCrossRef ? { apiCrossRef } : {}),
  };
}

/**
 * Quick trust level check — just returns the level.
 */
export async function getTrustLevel(
  wallet: string,
  rpcUrl: string = DEFAULT_RPC,
  apiUrl: string | null = DEFAULT_API
): Promise<TrustLevel> {
  const result = await verifyOnChain(wallet, rpcUrl, apiUrl);
  return result.trustLevel;
}

/**
 * Check if a wallet's on-chain identity root matches the API root.
 * Returns true if both agree, false if mismatch, null if can't determine.
 */
export async function checkIdentityConsistency(
  wallet: string,
  rpcUrl: string = DEFAULT_RPC,
  apiUrl: string = DEFAULT_API
): Promise<boolean | null> {
  const result = await verifyOnChain(wallet, rpcUrl, apiUrl);
  if (!result.apiCrossRef) return null;
  return result.apiCrossRef.match;
}

// ─── Exports ────────────────────────────────────────────────────

export { ANCHOR_WALLET, decodeAnchorMemo, b58decodeToStr, deriveTrustLevel };
export type { AnchorMemo, OnChainProof, OnChainVerification, Platform, TrustLevel };
