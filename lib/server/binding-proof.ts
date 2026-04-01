import { createHmac, timingSafeEqual } from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import type { Platform } from "@/lib/types";
import type { WalletProofPayload } from "@/lib/wallet-proof";
import { buildWalletProofMessage } from "@/lib/wallet-proof";
import { computeProofHash } from "@/lib/proof-hash";
import { isAllowedProofDomain } from "@/lib/server/domain-allowlist";

export interface BindingProof {
  method: string;
  algorithm: "HS256";
  verifier: string;
  issuedAt: string;
  socialSessionId: string;
  walletNonce: string;
  walletSignature: string;
  walletMessage: string;
  token: string;
}

export interface BindingProofPayload {
  v: "rialink-binding-v1";
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  proofHash: string;
  nonce?: string;
  issuedAt?: number;
  signature?: string;
  version?: "v1" | "v2";
  method: string;
  socialSessionId: string;
  verifiedAt: string;
  walletProof: {
    nonce: string;
    issuedAt: string;
    message: string;
    signature: string;
  };
}

export type VerifyBindingProofErrorCode =
  | "malformed_proof"
  | "invalid_signature"
  | "invalid_payload"
  | "proof_hash_mismatch"
  | "proof_expired"
  | "invalid_nonce"
  | "wallet_message_mismatch"
  | "wallet_signature_invalid"
  | "verification_failed";

type VerifyBindingProofResult =
  | { valid: true; payload: BindingProofPayload }
  | {
      valid: false;
      error: {
        code: VerifyBindingProofErrorCode;
        message: string;
      };
    };

const ALLOWED_PLATFORMS = new Set<Platform>(["github", "discord", "farcaster"]);
const PROOF_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isValidNonce(input: string): boolean {
  const value = String(input || "").trim();
  if (!value) return false;
  if (value === "legacy") return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidIsoTimestamp(input: string): boolean {
  const ts = Date.parse(input);
  return Number.isFinite(ts);
}

function isSha256Hex(input: string): boolean {
  return /^[a-f0-9]{64}$/i.test(input);
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function base64UrlDecodeToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

function isBase64UrlSegment(input: string) {
  return /^[A-Za-z0-9_-]+$/.test(input);
}

function extractDomainFromWalletMessage(message: string): string | null {
  const lines = message.split("\n");
  const domainLine = lines.find((line) => line.startsWith("Domain: "));
  if (!domainLine) return null;
  const domain = domainLine.slice("Domain: ".length).trim();
  if (!domain || /\s/.test(domain)) return null;
  return domain;
}

function getBindingSigningSecret() {
  const secret = process.env.PROOF_SIGNING_SECRET;
  if (!secret) {
    throw new Error("Missing PROOF_SIGNING_SECRET");
  }
  return secret;
}

function signBody(body: string): string {
  const secret = getBindingSigningSecret();
  return createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function isBindingPayload(value: unknown): value is BindingProofPayload {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const walletProof = row.walletProof as Record<string, unknown> | undefined;
  const version = String(row.version || "v1");
  const isVersionValid = version === "v1" || version === "v2";
  const nonceValid =
    row.nonce === undefined || (typeof row.nonce === "string" && row.nonce.length > 0);
  const issuedAtValid =
    row.issuedAt === undefined ||
    (typeof row.issuedAt === "number" && Number.isFinite(row.issuedAt));
  const signatureValid =
    row.signature === undefined ||
    (typeof row.signature === "string" && /^[a-f0-9]{64}$/i.test(row.signature));

  return (
    row.v === "rialink-binding-v1" &&
    isVersionValid &&
    typeof row.wallet === "string" &&
    row.wallet.length > 0 &&
    typeof row.platform === "string" &&
    ALLOWED_PLATFORMS.has(row.platform as Platform) &&
    typeof row.userId === "string" &&
    row.userId.length > 0 &&
    typeof row.username === "string" &&
    row.username.length > 0 &&
    typeof row.proofHash === "string" &&
    isSha256Hex(row.proofHash) &&
    nonceValid &&
    issuedAtValid &&
    signatureValid &&
    typeof row.method === "string" &&
    row.method.length > 0 &&
    typeof row.socialSessionId === "string" &&
    row.socialSessionId.length > 0 &&
    typeof row.verifiedAt === "string" &&
    isValidIsoTimestamp(row.verifiedAt) &&
    !!walletProof &&
    typeof walletProof.nonce === "string" &&
    walletProof.nonce.length > 0 &&
    typeof walletProof.issuedAt === "string" &&
    isValidIsoTimestamp(walletProof.issuedAt) &&
    typeof walletProof.message === "string" &&
    walletProof.message.length > 0 &&
    walletProof.message.length <= 4096 &&
    typeof walletProof.signature === "string"
  );
}

function verifyWalletSignature(payload: BindingProofPayload): boolean {
  try {
    const messageBytes = new TextEncoder().encode(payload.walletProof.message);
    const signatureBytes = bs58.decode(payload.walletProof.signature);
    const pubKey = new PublicKey(payload.wallet);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubKey.toBytes());
  } catch {
    return false;
  }
}

function verifyWalletProofMessage(payload: BindingProofPayload): boolean {
  const message = payload.walletProof.message;
  const issuedAtTs = Date.parse(payload.walletProof.issuedAt);
  const verifiedAtTs = Date.parse(payload.verifiedAt);
  if (!Number.isFinite(issuedAtTs) || !Number.isFinite(verifiedAtTs)) {
    return false;
  }
  if (issuedAtTs > verifiedAtTs) {
    return false;
  }

  const domain = extractDomainFromWalletMessage(message);
  if (!domain) {
    return false;
  }
  if (!isAllowedProofDomain(domain)) {
    return false;
  }

  // Enforce exact canonical wallet message format so hidden/extra lines cannot be smuggled into proofs.
  const expectedMessage = buildWalletProofMessage({
    wallet: payload.wallet,
    nonce: payload.walletProof.nonce,
    issuedAt: payload.walletProof.issuedAt,
    domain,
  });
  return message === expectedMessage;
}

export function createBindingProof(args: {
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  proofHash: string;
  nonce: string;
  issuedAt: number;
  signature: string;
  version: "v1" | "v2";
  proofMethod: string;
  socialSessionId: string;
  verifiedAt: string;
  walletProof: WalletProofPayload;
}): BindingProof {
  const payload: BindingProofPayload = {
    v: "rialink-binding-v1",
    wallet: args.wallet,
    platform: args.platform,
    userId: args.userId,
    username: args.username,
    proofHash: args.proofHash,
    nonce: args.nonce,
    issuedAt: args.issuedAt,
    signature: args.signature,
    version: args.version,
    method: args.proofMethod,
    socialSessionId: args.socialSessionId,
    verifiedAt: args.verifiedAt,
    walletProof: {
      nonce: args.walletProof.nonce,
      issuedAt: args.walletProof.issuedAt,
      message: args.walletProof.message,
      signature: args.walletProof.signature,
    },
  };

  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signBody(body);

  return {
    method: args.proofMethod,
    algorithm: "HS256",
    verifier: "rialink-api",
    issuedAt: args.verifiedAt,
    socialSessionId: args.socialSessionId,
    walletNonce: args.walletProof.nonce,
    walletSignature: args.walletProof.signature,
    walletMessage: args.walletProof.message,
    token: `${body}.${signature}`,
  };
}

export function verifyBindingProofToken(token: string): VerifyBindingProofResult {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) {
      return {
        valid: false,
        error: { code: "malformed_proof", message: "Malformed binding proof" },
      };
    }
    const [body, signature] = parts;
    if (!body || !signature || !isBase64UrlSegment(body) || !isBase64UrlSegment(signature)) {
      return {
        valid: false,
        error: { code: "malformed_proof", message: "Malformed binding proof" },
      };
    }

    const expectedSignature = signBody(body);
    const sigBuf = base64UrlDecodeToBuffer(signature);
    const expBuf = base64UrlDecodeToBuffer(expectedSignature);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return {
        valid: false,
        error: {
          code: "invalid_signature",
          message: "Invalid binding proof signature",
        },
      };
    }

    const decoded = JSON.parse(base64UrlDecode(body));
    if (!isBindingPayload(decoded)) {
      return {
        valid: false,
        error: {
          code: "invalid_payload",
          message: "Invalid binding proof payload",
        },
      };
    }

    const version = decoded.version === "v2" ? "v2" : "v1";
    const nonce = String(decoded.nonce || (version === "v1" ? "legacy" : "")).trim();
    if (!isValidNonce(nonce)) {
      return {
        valid: false,
        error: { code: "invalid_nonce", message: "Invalid proof nonce" },
      };
    }

    if (version === "v2") {
      const issuedAt = Number(decoded.issuedAt || 0);
      if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
        return {
          valid: false,
          error: { code: "invalid_payload", message: "Invalid proof issuedAt" },
        };
      }
      if (Date.now() - issuedAt > PROOF_MAX_AGE_MS) {
        return {
          valid: false,
          error: { code: "proof_expired", message: "Proof is older than 7 days" },
        };
      }
    }

    // Deterministic anti-tamper check:
    // recompute proof hash from wallet/platform/userId/nonce and compare with signed payload.
    const expectedProofHash = computeProofHash({
      wallet: decoded.wallet,
      platform: decoded.platform,
      platformUserId: decoded.userId,
      nonce,
      version,
    });
    if (decoded.proofHash !== expectedProofHash) {
      return {
        valid: false,
        error: { code: "proof_hash_mismatch", message: "Proof hash mismatch" },
      };
    }

    if (!verifyWalletProofMessage(decoded)) {
      return {
        valid: false,
        error: {
          code: "wallet_message_mismatch",
          message: "Wallet proof message mismatch",
        },
      };
    }

    if (!verifyWalletSignature(decoded)) {
      return {
        valid: false,
        error: {
          code: "wallet_signature_invalid",
          message: "Invalid wallet signature inside binding proof",
        },
      };
    }

    return { valid: true, payload: decoded };
  } catch {
    return {
      valid: false,
      error: {
        code: "verification_failed",
        message: "Binding proof verification failed",
      },
    };
  }
}

