import { PublicKey } from "@solana/web3.js";

export function normalizeWallet(value: unknown): string {
  return String(value || "").trim();
}

export function isValidWalletAddress(value: unknown): boolean {
  const wallet = normalizeWallet(value);
  if (!wallet) return false;
  try {
    // PublicKey constructor validates base58 format and key length.
    new PublicKey(wallet);
    return true;
  } catch {
    return false;
  }
}
