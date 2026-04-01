"use client";

import { useMemo, useState } from "react";

interface VerifyResult {
  wallet?: string;
  valid?: boolean;
  trustLevel?: string;
  proofs?: unknown[];
  error?: string;
}

interface PolicyResult {
  wallet?: string;
  policy?: string;
  passed?: boolean;
  trustLevel?: string;
  checks?: unknown[];
  accessToken?: string;
  error?: string;
}

function PrettyJson(props: { value: unknown }) {
  const content = useMemo(() => JSON.stringify(props.value, null, 2), [props.value]);
  return (
    <pre
      style={{
        margin: 0,
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid var(--border-default)",
        background: "var(--bg-base)",
        color: "var(--text-secondary)",
        fontFamily: "monospace",
        fontSize: "12px",
        overflowX: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {content}
    </pre>
  );
}

export function ApiPlayground() {
  const [wallet, setWallet] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [policyResult, setPolicyResult] = useState<PolicyResult | null>(null);

  async function runVerify() {
    const normalized = wallet.trim();
    if (!normalized) return;
    setVerifyLoading(true);
    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(normalized)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as VerifyResult;
      setVerifyResult(data);
    } catch (error) {
      setVerifyResult({
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  async function runPolicyCheck() {
    const normalized = wallet.trim();
    if (!normalized) return;
    setPolicyLoading(true);
    try {
      const response = await fetch("/api/policy/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: normalized,
          policy: "dao-grant",
        }),
      });
      const data = (await response.json()) as PolicyResult;
      setPolicyResult(data);
    } catch (error) {
      setPolicyResult({
        error: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setPolicyLoading(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        background: "var(--bg-surface)",
        padding: "20px",
        marginBottom: "18px",
      }}
    >
      <h2 style={{ fontSize: "20px", letterSpacing: "-0.01em", marginBottom: "8px" }}>
        Live API Playground
      </h2>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>
        Test real endpoints with a wallet address and inspect the exact JSON response.
      </p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <input
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
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
          onClick={runVerify}
          disabled={verifyLoading || !wallet.trim()}
          style={{
            height: "40px",
            padding: "0 14px",
            borderRadius: "10px",
            border: "none",
            background: "var(--accent)",
            color: "var(--text-inverse)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {verifyLoading ? "Calling /api/verify..." : "Run verify"}
        </button>
        <button
          onClick={runPolicyCheck}
          disabled={policyLoading || !wallet.trim()}
          style={{
            height: "40px",
            padding: "0 14px",
            borderRadius: "10px",
            border: "1px solid var(--border-default)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {policyLoading ? "Calling /api/policy/check..." : "Run policy check"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        <div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Verify Response
          </p>
          <PrettyJson value={verifyResult || { hint: "Run verify to see response" }} />
        </div>
        <div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginBottom: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Policy Check Response
          </p>
          <PrettyJson value={policyResult || { hint: "Run policy check to see response" }} />
        </div>
      </div>
    </section>
  );
}
