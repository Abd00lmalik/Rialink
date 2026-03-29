"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { buildWalletProofMessage, WalletProofPayload } from "@/lib/wallet-proof";

const STORAGE_PREFIX = "rialink_wallet_proof_";

export function getStoredWalletProof(wallet: string): WalletProofPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + wallet);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.signature || !parsed?.message) return null;
    return parsed as WalletProofPayload;
  } catch {
    return null;
  }
}

export function clearStoredWalletProof(wallet: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_PREFIX + wallet);
}

export function useWalletProof() {
  const { publicKey, signMessage } = useWallet();
  const [isSigning, setIsSigning] = useState(false);

  const ensureWalletProof = useCallback(async () => {
    if (!publicKey || !signMessage) throw new Error("Wallet signing is unavailable");
    const wallet = publicKey.toBase58();

    const existing = getStoredWalletProof(wallet);
    if (existing) return existing;

    setIsSigning(true);
    try {
      const res = await fetch(`/api/challenge?wallet=${wallet}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create wallet proof");

      const issuedAt = data.issuedAt || new Date().toISOString();
      const nonce = data.nonce;
      const domain = window.location.host;
      const message = buildWalletProofMessage({ wallet, nonce, issuedAt, domain });

      const signatureBytes = await signMessage(new TextEncoder().encode(message));
      const signature = bs58.encode(signatureBytes);

      const proof: WalletProofPayload = { wallet, nonce, issuedAt, message, signature };
      localStorage.setItem(STORAGE_PREFIX + wallet, JSON.stringify(proof));
      return proof;
    } finally {
      setIsSigning(false);
    }
  }, [publicKey, signMessage]);

  return { ensureWalletProof, isSigning };
}


