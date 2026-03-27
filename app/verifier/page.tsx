"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { Divider } from "@/components/ui/Divider";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { APP_URL } from "@/lib/constants";
import { POLICY_PRESETS } from "@/lib/policy";
import type { ProofRecord } from "@/lib/types";

const POLICY_OPTIONS = Object.entries(POLICY_PRESETS).map(([id, preset]) => ({
  id,
  label: preset.name,
}));

function VerifierDashboard() {
  const searchParams = useSearchParams();
  const [walletInput, setWalletInput] = useState("");
  const [walletResult, setWalletResult] = useState<string | null>(null);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<string>(() => POLICY_OPTIONS[0]?.id || "");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyResult, setPolicyResult] = useState<{
    eligible: boolean;
    reasons?: string[];
    accessToken?: string | null;
    expiresAt?: number | null;
  } | null>(null);

  const { copy: copyToken, copied: tokenCopied } = useCopyToClipboard();

  const vmCardUrl = useMemo(() => {
    if (!walletResult) return "";
    return `${APP_URL}/certificate/${walletResult}`;
  }, [walletResult]);

  const runLookup = useCallback(async (wallet: string) => {
    const trimmed = wallet.trim();
    if (!trimmed) {
      setError("Enter a wallet address to verify.");
      setProofs([]);
      setWalletResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setWalletResult(trimmed);
    setProofs([]);
    setPolicyResult(null);

    try {
      const res = await fetch(`/api/proof?wallet=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setProofs(Array.isArray(data?.proofs) ? data.proofs : []);
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

  const handlePolicyCheck = useCallback(async () => {
    if (!walletResult) return;
    setPolicyLoading(true);
    setPolicyResult(null);
    try {
      const res = await fetch("/api/policy/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletResult, policyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPolicyResult({ eligible: false, reasons: [data?.error || "Policy check failed"] });
      } else {
        setPolicyResult({
          eligible: !!data.eligible,
          reasons: Array.isArray(data.reasons) ? data.reasons : [],
          accessToken: data.accessToken || null,
          expiresAt: data.expiresAt || null,
        });
      }
    } catch {
      setPolicyResult({ eligible: false, reasons: ["Policy check failed. Try again."] });
    } finally {
      setPolicyLoading(false);
    }
  }, [walletResult, policyId]);

  const platformStatus = useMemo(
    () => [
      { id: "github", label: "GitHub", verified: proofs.some((p) => p.platform === "github") },
      { id: "discord", label: "Discord", verified: proofs.some((p) => p.platform === "discord") },
      { id: "farcaster", label: "Farcaster", verified: proofs.some((p) => p.platform === "farcaster") },
    ],
    [proofs]
  );

  const verifiedCount = platformStatus.filter((p) => p.verified).length;
  const riskLabel =
    verifiedCount >= 2 ? "Low risk signal" : verifiedCount === 1 ? "Medium risk signal" : "High risk signal";

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", padding: "96px 24px 80px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "6px" }}>
          Wallet Verifier
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Enter a wallet address to check social verification status and eligibility for gated access.
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
                Verification Summary
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                {platformStatus.map((platform) => (
                  <span
                    key={platform.id}
                    style={{
                      borderRadius: "999px",
                      border: "1px solid var(--border-subtle)",
                      background: platform.verified ? "rgba(34,197,94,0.13)" : "var(--bg-elevated)",
                      color: platform.verified ? "var(--success)" : "var(--text-muted)",
                      fontSize: "12px",
                      padding: "5px 10px",
                    }}
                  >
                    {platform.label}: {platform.verified ? "Verified" : "Not verified"}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: verifiedCount >= 2 ? "var(--success)" : "var(--text-secondary)" }}>
                {verifiedCount >= 2 ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <p style={{ margin: 0, fontSize: "13px" }}>
                  {riskLabel} ({verifiedCount}/3 platforms verified)
                </p>
              </div>
              {error && (
                <p style={{ fontSize: "13px", color: "var(--error)", marginTop: "10px" }}>
                  {error}
                </p>
              )}
            </div>

            <Divider my="8px" />

            <div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                Access Check
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                <select
                  value={policyId}
                  onChange={(e) => setPolicyId(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: "220px",
                    height: "38px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    padding: "0 10px",
                    fontSize: "13px",
                  }}
                >
                  {POLICY_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePolicyCheck}
                  disabled={policyLoading}
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--text-inverse)",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {policyLoading ? "Checking..." : "Check eligibility"}
                </button>
              </div>

              {policyResult && (
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "12px", background: "var(--bg-elevated)" }}>
                  <p style={{ fontSize: "13px", color: policyResult.eligible ? "var(--success)" : "var(--error)", marginBottom: "8px" }}>
                    {policyResult.eligible ? "Eligible" : "Not eligible"}
                  </p>
                  {policyResult.reasons && policyResult.reasons.length > 0 && (
                    <div style={{ display: "grid", gap: "4px", marginBottom: "8px" }}>
                      {policyResult.reasons.map((reason, idx) => (
                        <p key={`${reason}-${idx}`} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}
                  {policyResult.accessToken && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 10px" }}>
                        <div>
                          <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "2px" }}>
                            Access Pass
                          </p>
                          <p style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)", wordBreak: "break-all" }}>
                            {policyResult.accessToken}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToken(policyResult.accessToken || "")}
                          style={{ background: "none", border: "none", cursor: "pointer", color: tokenCopied ? "var(--success)" : "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
                        >
                          {tokenCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      {policyResult.expiresAt && (
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                          Expires {new Date(policyResult.expiresAt).toLocaleString()}
                        </p>
                      )}
                    </>
                  )}
                </div>
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
