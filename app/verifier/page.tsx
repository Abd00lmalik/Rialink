"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { APP_URL } from "@/lib/constants";
import { POLICY_PRESETS } from "@/lib/policy";
import { deriveTrustLevel, type TrustLevel } from "@/lib/trust-level";
import type { ProofRecord } from "@/lib/types";
import { maskUsername } from "@/lib/utils";

const POLICY_OPTIONS = Object.entries(POLICY_PRESETS).map(([id, preset]) => ({
  id,
  label: preset.name,
}));

const PLATFORM_LABELS: Record<ProofRecord["platform"], string> = {
  github: "GitHub",
  discord: "Discord",
  farcaster: "Farcaster",
};

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
  const [proofChecks, setProofChecks] = useState<Record<string, string>>({});
  const [copiedUsernameKey, setCopiedUsernameKey] = useState<string | null>(null);

  const { copy: copyToken, copied: tokenCopied } = useCopyToClipboard();
  const { copy: copyWallet, copied: walletCopied } = useCopyToClipboard();

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
    setProofChecks({});
    setCopiedUsernameKey(null);

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
  const trustLevel: TrustLevel = useMemo(() => deriveTrustLevel(proofs), [proofs]);
  const trustLabel =
    trustLevel === "high"
      ? "High Trust Wallet"
      : trustLevel === "medium"
      ? "Medium Trust Wallet"
      : "Low Trust Wallet";
  const primaryIdentity = useMemo(() => {
    if (proofs.length === 0) return null;
    const priority: Record<ProofRecord["platform"], number> = {
      github: 0,
      farcaster: 1,
      discord: 2,
    };
    return [...proofs].sort((a, b) => priority[a.platform] - priority[b.platform])[0];
  }, [proofs]);
  const aggregateStats = useMemo(
    () =>
      proofs.reduce(
        (acc, proof) => ({
          repos: acc.repos + Number(proof.repoCount || 0),
          commits: acc.commits + Number(proof.commitCount || 0),
          followers: acc.followers + Number(proof.followerCount || 0),
          servers: acc.servers + Number(proof.serverCount || 0),
        }),
        { repos: 0, commits: 0, followers: 0, servers: 0 }
      ),
    [proofs]
  );
  const getDisplayUsername = useCallback((proof: ProofRecord) => {
    if (proof.platform === "farcaster") {
      return maskUsername(proof.username);
    }
    return proof.username;
  }, []);

  const handleVerifyProof = useCallback(async (proof: ProofRecord) => {
    const key = `${proof.platform}-${proof.userId}`;
    const token = proof.bindingProof?.token || "";
    if (!token) {
      setProofChecks((prev) => ({ ...prev, [key]: "No binding proof token found" }));
      return;
    }

    setProofChecks((prev) => ({ ...prev, [key]: "Verifying..." }));
    try {
      const res = await fetch("/api/verify-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binding_proof: token }),
      });
      const data = await res.json();
      if (!res.ok || !data?.valid) {
        const errorCode =
          data?.error && typeof data.error.code === "string" ? data.error.code : "";
        const errorMessage =
          data?.error && typeof data.error.message === "string"
            ? data.error.message
            : typeof data?.error === "string"
            ? data.error
            : "verification failed";
        setProofChecks((prev) => ({
          ...prev,
          [key]: `Invalid proof${errorCode ? ` (${errorCode})` : ""}: ${errorMessage}`,
        }));
        return;
      }

      const verifiedUsername =
        proof.platform === "farcaster"
          ? maskUsername(String(data?.username || proof.username || ""))
          : String(data?.username || proof.username || "");
      const boundWallet = proof.wallet || walletResult || "this wallet";
      setProofChecks((prev) => ({
        ...prev,
        [key]: `Valid proof: ${verifiedUsername} (${data.platform}) is bound to ${boundWallet}`,
      }));
    } catch {
      setProofChecks((prev) => ({
        ...prev,
        [key]: "Proof verification request failed",
      }));
    }
  }, [walletResult]);

  const handleCopyUsername = useCallback(async (key: string, username: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsernameKey(key);
      setTimeout(() => setCopiedUsernameKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      setCopiedUsernameKey(null);
    }
  }, []);

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
        <div style={{ display: "grid", gap: "14px" }}>
          <section style={{ background: "linear-gradient(145deg, var(--bg-surface), var(--bg-elevated))", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "18px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Section 1: Profile Header
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                  Wallet Identity Profile
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                  <AddressDisplay address={walletResult} />
                  <button
                    onClick={() => copyWallet(walletResult)}
                    style={{ height: "28px", padding: "0 8px", borderRadius: "8px", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}
                  >
                    {walletCopied ? "Copied" : "Copy wallet"}
                  </button>
                </div>
                {primaryIdentity && (
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    Primary identity: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{getDisplayUsername(primaryIdentity)}</span> on {PLATFORM_LABELS[primaryIdentity.platform]}
                  </p>
                )}
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginTop: "12px" }}>
              <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "10px", background: "var(--bg-elevated)" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  Trust Level
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: trustLevel === "high" ? "var(--success)" : trustLevel === "medium" ? "var(--accent-text)" : "var(--text-secondary)" }}>
                  {trustLevel === "high" ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>{trustLabel}</p>
                </div>
              </div>
              <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "10px", background: "var(--bg-elevated)" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  Verified Identities
                </p>
                <p style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)", fontWeight: 700 }}>
                  {verifiedCount} linked accounts
                </p>
              </div>
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "var(--error)", marginTop: "10px" }}>
                {error}
              </p>
            )}
          </section>

          <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "18px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              Section 2: Verified Identities
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
              Each profile entry below is cryptographically bound to this wallet.
            </p>
            {proofs.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                No linked identities found.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {proofs.map((proof) => {
                  const key = `${proof.platform}-${proof.userId}`;
                  const platformLabel = PLATFORM_LABELS[proof.platform];
                  const displayUsername = getDisplayUsername(proof);
                  return (
                    <div key={key} style={{ border: "1px solid var(--border-subtle)", borderRadius: "10px", background: "var(--bg-elevated)", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                          {proof.pfpUrl ? (
                            <img src={proof.pfpUrl} alt={`${displayUsername} avatar`} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-default)" }} />
                          ) : (
                            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "var(--accent)", color: "var(--text-inverse)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>
                              {(displayUsername?.[0] || "?").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 700, marginBottom: "2px" }}>
                              {displayUsername}
                            </p>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{platformLabel}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: "12px", color: "var(--success)", fontWeight: 600 }}>Verified</p>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                        Verified via {platformLabel}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                        Verified on {new Date(proof.verifiedAt).toLocaleString()}
                      </p>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {proof.repoCount !== undefined && (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                            Repos: {proof.repoCount}
                          </span>
                        )}
                        {proof.commitCount !== undefined && (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                            Commits: {proof.commitCount}
                          </span>
                        )}
                        {proof.followerCount !== undefined && (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                            Followers: {proof.followerCount}
                          </span>
                        )}
                        {proof.serverCount !== undefined && (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                            Servers: {proof.serverCount}
                          </span>
                        )}
                        {proof.accountCreatedAt && (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                            Since {new Date(proof.accountCreatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleCopyUsername(key, displayUsername)}
                          style={{ height: "28px", padding: "0 8px", borderRadius: "8px", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}
                        >
                          {copiedUsernameKey === key ? "Copied" : "Copy username"}
                        </button>
                        <button
                          onClick={() => handleVerifyProof(proof)}
                          style={{ height: "28px", padding: "0 8px", borderRadius: "8px", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Verify proof
                        </button>
                      </div>
                      {proofChecks[key] && (
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                          {proofChecks[key]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "18px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Section 3: Activity / Stats
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                Total repos: {aggregateStats.repos}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                Total commits: {aggregateStats.commits}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                Total followers: {aggregateStats.followers}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "4px 8px" }}>
                Total servers: {aggregateStats.servers}
              </span>
            </div>
          </section>

          <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "18px" }}>
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
          </section>
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
