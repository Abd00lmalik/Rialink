"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink } from "lucide-react";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { Divider } from "@/components/ui/Divider";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { APP_URL } from "@/lib/constants";
import { createProofShareCode, formatProofHash, formatTxSignature } from "@/lib/utils";
import type { ProofRecord } from "@/lib/types";

function VerifierDashboard() {
  const searchParams = useSearchParams();
  const [walletInput, setWalletInput] = useState("");
  const [walletResult, setWalletResult] = useState<string | null>(null);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [identityRoot, setIdentityRoot] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { copy: copyRoot, copied: rootCopied } = useCopyToClipboard();

  const vmCardUrl = useMemo(() => {
    if (!walletResult) return "";
    return `${APP_URL}/certificate/${walletResult}`;
  }, [walletResult]);

  const runLookup = useCallback(async (wallet: string) => {
    const trimmed = wallet.trim();
    if (!trimmed) {
      setError("Enter a wallet address to verify.");
      setProofs([]);
      setIdentityRoot(null);
      setCardId(null);
      setWalletResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setWalletResult(trimmed);
    setProofs([]);
    setIdentityRoot(null);
    setCardId(null);

    try {
      const res = await fetch(`/api/proof?wallet=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setProofs(Array.isArray(data?.proofs) ? data.proofs : []);
      setIdentityRoot(data?.identityRoot || null);
      setCardId(data?.cardId || null);
      if (!data?.proofs || data.proofs.length === 0) {
        setError("No proofs found for this wallet.");
      }
    } catch {
      setError("Could not load proofs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const walletParam = searchParams.get("wallet");
    if (walletParam) {
      setWalletInput(walletParam);
      runLookup(walletParam);
    }
  }, [searchParams, runLookup]);

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", padding: "96px 24px 80px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "6px" }}>
          Verify a Wallet
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Enter a wallet address to check verified platforms, proof hashes, and the identity root.
        </p>
      </div>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="Wallet address"
            style={{
              flex: 1,
              minWidth: "260px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              padding: "0 12px",
              fontFamily: "monospace",
              fontSize: "13px",
            }}
          />
          <button
            onClick={() => runLookup(walletInput)}
            disabled={loading}
            style={{
              height: "40px",
              padding: "0 16px",
              borderRadius: "10px",
              border: "none",
              background: "var(--accent)",
              color: "var(--text-inverse)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Checking..." : "Check proofs"}
          </button>
        </div>
        <p style={{ marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
          Tip: Always verify on the official VerifyMe domain and avoid screenshots.
        </p>
      </div>

      {walletResult && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                Wallet
              </p>
              <AddressDisplay address={walletResult} />
            </div>
            {vmCardUrl && (
              <a
                href={vmCardUrl}
                style={{ fontSize: "13px", color: "var(--accent-text)", display: "flex", alignItems: "center", gap: "6px" }}
              >
                View VM Card <ExternalLink size={12} />
              </a>
            )}
          </div>

          <Divider my="16px" />

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Identity Root
              </p>
              {identityRoot ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "10px 12px" }}>
                  <p style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--text-muted)" }}>{formatProofHash(identityRoot)}</p>
                  <button
                    onClick={() => copyRoot(identityRoot)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: rootCopied ? "var(--success)" : "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
                  >
                    {rootCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No identity root yet.</p>
              )}
              {cardId && (
                <p style={{ marginTop: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                  Card ID: {cardId}
                </p>
              )}
            </div>

            <Divider my="8px" />

            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                Platform Proofs
              </p>

              {error && (
                <p style={{ fontSize: "13px", color: "var(--error)", marginBottom: "10px" }}>
                  {error}
                </p>
              )}

              {proofs.map((proof) => {
                const shareCode = createProofShareCode(proof.proofHash);
                return (
                  <div key={proof.platform} style={{ border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "12px", marginBottom: "10px", background: "var(--bg-elevated)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {proof.platform.charAt(0).toUpperCase() + proof.platform.slice(1)}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {proof.maskedUsername || "Verified account"}
                        </p>
                      </div>
                      {proof.txSignature && (
                        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Tx: {formatTxSignature(proof.txSignature)}
                        </p>
                      )}
                    </div>

                    <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 10px" }}>
                        <div>
                          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "2px" }}>
                            Proof Hash
                          </p>
                          <p style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                            {formatProofHash(proof.proofHash)}
                          </p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(proof.proofHash)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 10px" }}>
                        <div>
                          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "2px" }}>
                            Share Code
                          </p>
                          <p style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                            {shareCode}
                          </p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(shareCode)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {proofs.length > 0 && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px" }}>
                  For high-stakes verification, ask the user to sign a fresh wallet message to confirm ownership.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifierPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <VerifierDashboard />
    </Suspense>
  );
}
