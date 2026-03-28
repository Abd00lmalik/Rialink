import { createHmac, timingSafeEqual } from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import type { Platform } from "@/lib/types";
import type { WalletProofPayload } from "@/lib/wallet-proof";
import { computeProofHash } from "@/lib/proof-hash";

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
  v: "verifyme-binding-v1";
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  proofHash: string;
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

type VerifyBindingProofResult =
  | { valid: true; payload: BindingProofPayload }
  | { valid: false; error: string };

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

function getBindingSigningSecret() {
  const secret = process.env.PROOF_SIGNING_SECRET || process.env.POLICY_SIGNING_SECRET;
  if (!secret) {
    throw new Error("Missing PROOF_SIGNING_SECRET (or POLICY_SIGNING_SECRET fallback)");
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

  return (
    row.v === "verifyme-binding-v1" &&
    typeof row.wallet === "string" &&
    typeof row.platform === "string" &&
    typeof row.userId === "string" &&
    typeof row.username === "string" &&
    typeof row.proofHash === "string" &&
    typeof row.method === "string" &&
    typeof row.socialSessionId === "string" &&
    typeof row.verifiedAt === "string" &&
    !!walletProof &&
    typeof walletProof.nonce === "string" &&
    typeof walletProof.issuedAt === "string" &&
    typeof walletProof.message === "string" &&
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
  // Basic anti-tamper checks so the proof must still reference the same wallet and nonce.
  return (
    message.includes(`Wallet: ${payload.wallet}`) &&
    message.includes(`Nonce: ${payload.walletProof.nonce}`)
  );
}

export function createBindingProof(args: {
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  proofHash: string;
  proofMethod: string;
  socialSessionId: string;
  verifiedAt: string;
  walletProof: WalletProofPayload;
}): BindingProof {
  const payload: BindingProofPayload = {
    v: "verifyme-binding-v1",
    wallet: args.wallet,
    platform: args.platform,
    userId: args.userId,
    username: args.username,
    proofHash: args.proofHash,
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
    verifier: "verifyme-api",
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
    const [body, signature] = String(token || "").split(".");
    if (!body || !signature) {
      return { valid: false, error: "Malformed binding proof" };
    }

    const expectedSignature = signBody(body);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "Invalid binding proof signature" };
    }

    const decoded = JSON.parse(base64UrlDecode(body));
    if (!isBindingPayload(decoded)) {
      return { valid: false, error: "Invalid binding proof payload" };
    }

    // Deterministic anti-tamper check:
    // recompute proof hash from wallet/platform/userId and compare with signed payload.
    const expectedProofHash = computeProofHash({
      wallet: decoded.wallet,
      platform: decoded.platform,
      platformUserId: decoded.userId,
    });
    if (decoded.proofHash !== expectedProofHash) {
      return { valid: false, error: "Proof hash mismatch" };
    }

    if (!verifyWalletProofMessage(decoded)) {
      return { valid: false, error: "Wallet proof message mismatch" };
    }

    if (!verifyWalletSignature(decoded)) {
      return { valid: false, error: "Invalid wallet signature inside binding proof" };
    }

    return { valid: true, payload: decoded };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Binding proof verification failed",
    };
  }
}
