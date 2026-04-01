import { Redis } from "@upstash/redis";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import type { WalletProofPayload } from "@/lib/wallet-proof";
import { buildWalletProofMessage } from "@/lib/wallet-proof";
import { isAllowedProofDomain } from "@/lib/server/domain-allowlist";

const redis = Redis.fromEnv();
const CHALLENGE_TTL_SECONDS = 10 * 60;

function challengeKey(wallet: string) {
  return `challenge:${wallet}`;
}

function extractDomainFromWalletMessage(message: string): string | null {
  const lines = message.split("\n");
  const domainLine = lines.find((line) => line.startsWith("Domain: "));
  if (!domainLine) return null;
  const domain = domainLine.slice("Domain: ".length).trim();
  if (!domain || /\s/.test(domain)) return null;
  return domain;
}

export async function issueWalletChallenge(wallet: string) {
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const issuedAt = new Date().toISOString();
  await redis.set(challengeKey(wallet), nonce, { ex: CHALLENGE_TTL_SECONDS });
  return { nonce, issuedAt };
}

export async function verifyWalletProof(wallet: string, proof: WalletProofPayload | undefined) {
  if (!proof || !proof.message || !proof.signature || !proof.nonce) {
    return { ok: false, error: "Missing wallet proof" };
  }
  if (proof.wallet !== wallet) {
    return { ok: false, error: "Wallet proof wallet mismatch" };
  }
  if (!proof.issuedAt || !Number.isFinite(Date.parse(proof.issuedAt))) {
    return { ok: false, error: "Wallet proof issuedAt is invalid" };
  }

  const expected = await redis.get<string>(challengeKey(wallet));
  if (!expected || expected !== proof.nonce) {
    return { ok: false, error: "Wallet proof expired or invalid" };
  }

  const domain = extractDomainFromWalletMessage(proof.message);
  if (!domain) {
    return { ok: false, error: "Wallet proof message mismatch" };
  }
  if (!isAllowedProofDomain(domain)) {
    return { ok: false, error: "Wallet proof domain is not allowed" };
  }
  const expectedMessage = buildWalletProofMessage({
    wallet,
    nonce: proof.nonce,
    issuedAt: proof.issuedAt,
    domain,
  });
  if (proof.message !== expectedMessage) {
    return { ok: false, error: "Wallet proof message mismatch" };
  }

  try {
    const msgBytes = new TextEncoder().encode(proof.message);
    const sigBytes = bs58.decode(proof.signature);
    const pubKey = new PublicKey(wallet);
    const valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKey.toBytes());
    if (!valid) return { ok: false, error: "Invalid wallet signature" };
  } catch {
    return { ok: false, error: "Invalid wallet signature" };
  }

  // Keep the challenge active for a short session window to avoid re-signing every action
  await redis.set(challengeKey(wallet), proof.nonce, { ex: CHALLENGE_TTL_SECONDS });
  return { ok: true };
}
