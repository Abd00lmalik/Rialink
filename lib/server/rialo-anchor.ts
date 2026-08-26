import bs58 from "bs58";
import {
  Keypair,
  PublicKey,
  TransactionBuilder,
  createRialoClient,
  RIALO_TESTNET_CHAIN,
} from "@rialo/ts-cdk";

export const DEFAULT_RIALO_RPC_URL = "https://testnet.rialo.io:4101";
export const ANCHOR_CHAIN_ID = "rialo-testnet";
export const EXPLORER_TX_BASE_URL = "https://testnet.rialoscan.org";
// SPL Memo program address (same address as Solana's memo program).
const MEMO_PROGRAM_ADDRESS = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export type AnchorAction = "create" | "revoke";

export interface AnchorReceipt {
  chain: string;
  txSignature: string;
  anchoredAt: string;
}

let cachedSigner: { secret: string; keypair: Keypair } | null = null;

function getAnchorRpcUrl(): string {
  return (
    String(process.env.RIALO_RPC_URL || "").trim() || DEFAULT_RIALO_RPC_URL
  );
}

function loadSigner(): Keypair | null {
  const secret = String(process.env.RIALINK_ANCHOR_SECRET || "").trim();
  if (!secret) return null;
  if (cachedSigner && cachedSigner.secret === secret) return cachedSigner.keypair;

  const seed = bs58.decode(secret);
  if (seed.length !== 32) {
    throw new Error(
      `RIALINK_ANCHOR_SECRET must decode to 32 bytes, got ${seed.length}`
    );
  }
  const keypair = Keypair.fromSecretKey(seed);
  cachedSigner = { secret, keypair };
  return keypair;
}

export function isAnchorConfigured(): boolean {
  return Boolean(String(process.env.RIALINK_ANCHOR_SECRET || "").trim());
}

export function getAnchorAddress(): string | null {
  try {
    const signer = loadSigner();
    return signer ? String(signer.publicKey) : null;
  } catch {
    return null;
  }
}

function createClient() {
  const rpcUrl = getAnchorRpcUrl();
  const chain =
    rpcUrl === RIALO_TESTNET_CHAIN.rpcUrl
      ? RIALO_TESTNET_CHAIN
      : { ...RIALO_TESTNET_CHAIN, rpcUrl };
  return createRialoClient({ chain });
}

async function sendMemoTransaction(signer: Keypair, payloadText: string): Promise<string> {
  const client = createClient();
  const configHashPrefix = await client.getConfigHashPrefix();
  const tx = TransactionBuilder.create()
    .setPayer(signer.publicKey)
    .setValidFrom(BigInt(Date.now()))
    .setConfigHashPrefix(configHashPrefix)
    .addInstruction({
      programId: PublicKey.fromString(MEMO_PROGRAM_ADDRESS),
      accounts: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
      data: new TextEncoder().encode(payloadText),
    })
    .build();

  // The SDK's send* helpers expect serialized wire bytes, not the tx object.
  const result = await client.sendAndConfirmTransaction(tx.sign(signer).serialize());

  // Defensive extraction: SDK versions have returned either a plain base58
  // string or an object carrying the signature.
  const raw = (result as { signature?: unknown })?.signature ?? result;
  if (typeof raw === "string") return raw;
  if (raw instanceof Uint8Array) return bs58.encode(raw);
  throw new Error("anchor_submit_failed: unexpected RPC response shape");
}

/**
 * Publishes a tamper-evident receipt for an identity root on Rialo.
 *
 * The memo payload is human-readable and independently verifiable:
 *   rialink:v1|<action>|<wallet>|<identityRootHex>
 */
export async function anchorIdentityRoot(params: {
  action: AnchorAction;
  wallet: string;
  identityRoot: string;
}): Promise<AnchorReceipt> {
  const signer = loadSigner();
  if (!signer) {
    throw new Error("anchor_not_configured: RIALINK_ANCHOR_SECRET is not set");
  }

  const payload = `rialink:v1|${params.action}|${params.wallet}|${params.identityRoot}`;
  const txSignature = await sendMemoTransaction(signer, payload);

  return {
    chain: ANCHOR_CHAIN_ID,
    txSignature,
    anchoredAt: new Date().toISOString(),
  };
}

/**
 * Reads the anchor wallet balance over raw JSON-RPC (no SDK needed).
 * Returns null when the anchor wallet is not configured.
 */
export async function fetchAnchorBalance(): Promise<{
  address: string;
  balanceKelvin: number;
} | null> {
  const signer = loadSigner();
  if (!signer) return null;

  const address = String(signer.publicKey);
  const res = await fetch(getAnchorRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [{ address }],
    }),
    signal: AbortSignal.timeout(4_000),
  });
  if (!res.ok) {
    throw new Error(`anchor_rpc_http_${res.status}`);
  }
  const payload = (await res.json()) as {
    result?: { value?: number | string };
    error?: { message?: string };
  };
  if (payload.error) {
    throw new Error(`anchor_rpc_error: ${String(payload.error.message || "unknown").slice(0, 120)}`);
  }
  const kelvin = Number(payload.result?.value);
  if (!Number.isFinite(kelvin) || kelvin < 0) {
    throw new Error("anchor_unexpected_response: balance missing");
  }
  return { address, balanceKelvin: Math.floor(kelvin) };
}
