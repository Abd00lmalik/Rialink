"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import type { VerificationState, ProofRecord, Platform } from "@/lib/types";

const PLATFORMS = ["github", "discord", "farcaster"] as const;
const LS_PREFIX = "verifyme_proof_";

//  localStorage helpers (survive OAuth redirects) 
export function saveProofToStorage(wallet: string, proof: ProofRecord) {
  try {
    const key = LS_PREFIX + wallet;
    const existing: ProofRecord[] = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = existing.filter((p) => p.platform !== proof.platform);
    localStorage.setItem(key, JSON.stringify([...filtered, proof]));
  } catch {}
}

export function removeProofFromStorage(wallet: string, platform: Platform) {
  try {
    const key = LS_PREFIX + wallet;
    const existing: ProofRecord[] = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify(existing.filter((p) => p.platform !== platform)));
  } catch {}
}

function loadFromStorage(wallet: string): ProofRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + wallet) || "[]");
  } catch { return []; }
}

function toStates(proofs: ProofRecord[]): VerificationState[] {
  return PLATFORMS.map((p) => {
    const proof = proofs.find((r) => r.platform === p);
    return proof
      ? { platform: p, status: "verified" as const, proof }
      : { platform: p, status: "unverified" as const };
  });
}

export function useVerifications(wallet: string | null) {
  const [verifications, setVerifications] = useState<VerificationState[]>(
    PLATFORMS.map((p) => ({ platform: p, status: "unverified" as const }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastWalletRef = useRef<string | null>(null);
  const hasMountedRef = useRef(false);

  const fetch_ = useCallback(async (addr: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Show localStorage data immediately (no flicker)
      const cached = loadFromStorage(addr);
      if (cached.length > 0) setVerifications(toStates(cached));

      // 2. Then fetch from server and merge
      const res = await fetch(`/api/proof?wallet=${addr}`);
      const data = await res.json();
      const serverProofs: ProofRecord[] = data.proofs || [];

      // Merge: server wins, but keep any localStorage entries server doesn't have yet
      const merged = [...serverProofs];
      const cachedFresh = loadFromStorage(addr);
      for (const lp of cachedFresh) {
        if (!merged.find((sp) => sp.platform === lp.platform)) {
          merged.push(lp);
        }
      }

      setVerifications(toStates(merged));
      lastWalletRef.current = addr;
    } catch (e) {
      // On network error, fall back to localStorage so UI stays populated
      const cached = loadFromStorage(addr);
      setVerifications(toStates(cached));
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      // On first mount, check localStorage for any wallet (covers post-OAuth redirect)
      const pendingWallet = typeof window !== "undefined"
        ? localStorage.getItem("verifyme_pending_wallet")
        : null;
      const addr = wallet || pendingWallet;
      if (addr) {
        fetch_(addr);
        lastWalletRef.current = addr;
      }
      return;
    }
    // After mount: only re-fetch when wallet actually changes to a real address
    // Do NOT clear when wallet goes null (covers the OAuth redirect reconnect window)
    if (wallet && wallet !== lastWalletRef.current) {
      fetch_(wallet);
    }
  }, [wallet, fetch_]);

  const refetch = useCallback(() => {
    const addr = wallet || lastWalletRef.current;
    if (addr) fetch_(addr);
  }, [wallet, fetch_]);

  return { verifications, setVerifications, isLoading, error, refetch };
}

