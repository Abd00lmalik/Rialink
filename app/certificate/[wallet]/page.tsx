"use client";

import { useEffect, useState } from "react";
import type { ProofRecord } from "@/lib/types";

const PLATFORMS = ["github", "discord", "farcaster"] as const;
const NAMES: Record<string, string> = {
  github: "GitHub",
  discord: "Discord",
  farcaster: "Farcaster",
};

function shortWallet(wallet: string) {
  if (!wallet) return "";
  return wallet.slice(0, 6) + "..." + wallet.slice(-4);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CertificatePage({ params }: { params: { wallet: string } }) {
  const wallet = params.wallet;
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(false);

  useEffect(() => {
    fetch("/api/proof?wallet=" + wallet)
      .then((r) => r.json())
      .then((d) => setProofs(d?.proofs || []))
      .catch(() => setProofs([]));
  }, [wallet]);

  const count = proofs.length;
  const issueDate =
    count > 0
      ? formatDate(proofs[count - 1].verifiedAt)
      : formatDate(new Date().toISOString());

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleMint() {
    setMinting(true);
    setTimeout(() => {
      setMinting(false);
      setMinted(true);
    }, 1800);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e8eefc", padding: "40px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>VerifyMe Certificate</h1>
        <p style={{ opacity: 0.8, marginTop: 8 }}>Soulbound identity card for {shortWallet(wallet)}</p>

        <div
          style={{
            marginTop: 20,
            border: "1px solid #24304f",
            borderRadius: 18,
            background: "linear-gradient(160deg, #0f1630 0%, #0d1428 100%)",
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Network</div>
              <div style={{ fontWeight: 700 }}>Rialo Devnet</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Issued</div>
              <div style={{ fontWeight: 700 }}>{issueDate}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>Verified identities</div>
          <div style={{ display: "grid", gap: 8 }}>
            {PLATFORMS.map((p) => {
              const verified = proofs.some((x) => x.platform === p);
              return (
                <div
                  key={p}
                  style={{
                    border: "1px solid " + (verified ? "#1f8f64" : "#2b3552"),
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    background: verified ? "rgba(31,143,100,0.12)" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <span>{NAMES[p]}</span>
                  <strong>{verified ? "Verified" : "Not verified"}</strong>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, fontSize: 13 }}>
            Score: <strong>{count}/3</strong>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <button
            onClick={handleMint}
            disabled={minting || minted || count === 0}
            style={{
              height: 44,
              borderRadius: 10,
              border: "none",
              background: minted ? "#1f8f64" : "#2f6df6",
              color: "#fff",
              fontWeight: 700,
              cursor: minting || minted || count === 0 ? "default" : "pointer",
            }}
          >
            {minting ? "Minting..." : minted ? "Minted" : "Mint Soulbound NFT"}
          </button>

          <button
            onClick={copyLink}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #2b3552",
              background: "transparent",
              color: "#e8eefc",
            }}
          >
            {copied ? "Copied" : "Copy certificate link"}
          </button>

          <a href={"/profile/" + wallet} style={{ color: "#88a6ff", textDecoration: "none" }}>
            View profile
          </a>
        </div>
      </div>
    </div>
  );
}
