"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProofRecord } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const PLATFORMS = ["github", "discord", "farcaster"] as const;
const META: Record<string, { label: string; color: string }> = {
  github: { label: "GitHub", color: "#8b5cf6" },
  discord: { label: "Discord", color: "#5865F2" },
  farcaster: { label: "Farcaster", color: "#855DCD" }
};

function shortWallet(wallet: string) {
  return wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "";
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtHash(hash: string) {
  const clean = (hash || "").replace(/^0x/, "");
  if (clean.length < 10) return hash;
  return "0x" + clean.slice(0, 6) + "..." + clean.slice(-6);
}

function cardId(wallet: string) {
  return "VM-" + wallet.slice(-6).toUpperCase();
}

export default function CertificatePage({ params }: { params: { wallet: string } }) {
  const wallet = params.wallet;
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/proof?wallet=" + wallet)
      .then((r) => r.json())
      .then((d) => setProofs(d?.proofs || []))
      .catch(() => setProofs([]));
  }, [wallet]);

  const count = proofs.length;
  const issueDate = count > 0 ? fmtDate(proofs[count - 1].verifiedAt) : fmtDate(new Date().toISOString());
  const topProof = useMemo(() => proofs.find((p) => p.pfpUrl) || proofs[0], [proofs]);
  const statusText = count === 3 ? "Fully Verified" : count > 0 ? `${count}/3 Verified` : "Unverified";

  const shareUrl = typeof window !== "undefined" ? window.location.href : `${APP_URL}/certificate/${wallet}`;
  const xText = encodeURIComponent(`I just generated my VM Card on VerifyMe (${count}/3 identities verified on Rialo).`);
  const xHref = `https://twitter.com/intent/tweet?text=${xText}&url=${encodeURIComponent(shareUrl)}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 500px at 20% -10%, rgba(92,225,230,0.16), transparent 60%), radial-gradient(900px 500px at 90% 110%, rgba(124,58,237,0.2), transparent 65%), #040815",
        color: "#e6edff",
        padding: "88px 16px 48px"
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.02em" }}>VM Card</h1>
        <p style={{ marginTop: 8, color: "rgba(230,237,255,0.78)" }}>
          Shareable identity card for {shortWallet(wallet)}
        </p>

        <div
          style={{
            marginTop: 20,
            borderRadius: 24,
            border: "1px solid rgba(146,170,255,0.28)",
            background:
              "linear-gradient(145deg, rgba(10,16,36,0.96) 0%, rgba(10,20,44,0.88) 45%, rgba(15,22,52,0.96) 100%)",
            boxShadow: "0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(230,237,255,0.6)" }}>
                  VerifyMe
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{statusText}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "rgba(230,237,255,0.65)" }}>Card ID</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "#5CE1E6" }}>{cardId(wallet)}</div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(92,225,230,0.2)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12
              }}
            >
              {topProof?.pfpUrl ? (
                <img
                  src={topProof.pfpUrl}
                  alt="profile"
                  style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(92,225,230,0.3)" }}
                />
              ) : (
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #5CE1E6, #7C3AED)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700
                  }}
                >
                  {wallet[0]?.toUpperCase() || "V"}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "rgba(230,237,255,0.65)" }}>Wallet</div>
                <div style={{ fontSize: 15, fontFamily: "monospace" }}>{shortWallet(wallet)}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "rgba(230,237,255,0.65)" }}>Issued</div>
                <div style={{ fontSize: 14 }}>{issueDate}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {PLATFORMS.map((p) => {
                const proof = proofs.find((x) => x.platform === p);
                const verified = Boolean(proof);
                return (
                  <div
                    key={p}
                    style={{
                      borderRadius: 12,
                      border: "1px solid " + (verified ? "rgba(52,211,153,0.35)" : "rgba(146,170,255,0.18)"),
                      background: verified ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: META[p].color, display: "inline-block" }} />
                      <span>{META[p].label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: verified ? "#34D399" : "rgba(230,237,255,0.55)" }}>
                      {verified ? "Verified" : "Not linked"}
                    </span>
                  </div>
                );
              })}
            </div>

            {proofs.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "rgba(230,237,255,0.72)", fontFamily: "monospace" }}>
                Latest proof: {fmtHash(proofs[proofs.length - 1].proofHash)}
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(146,170,255,0.22)",
              padding: "12px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(92,225,230,0.04)"
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(230,237,255,0.7)" }}>Network: Rialo Devnet</span>
            <span style={{ fontSize: 12, color: "rgba(230,237,255,0.7)" }}>Score: {count}/3</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: 46,
              borderRadius: 12,
              background: "linear-gradient(135deg, #5CE1E6, #4F46E5)",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            Share VM Card on X
          </a>

          <button
            onClick={copyLink}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid rgba(146,170,255,0.35)",
              background: "transparent",
              color: "#e6edff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {copied ? "Copied" : "Copy VM Card link"}
          </button>

          <a href={"/profile/" + wallet} style={{ color: "#8eb1ff", textDecoration: "none" }}>
            View profile
          </a>
        </div>
      </div>
    </div>
  );
}
