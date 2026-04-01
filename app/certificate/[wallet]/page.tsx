"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProofRecord } from "@/lib/types";
import { APP_URL } from "@/lib/constants";
import { cardIdFromWallet } from "@/lib/card-id";
import { useWallet } from "@solana/wallet-adapter-react";
const ORDER = ["github", "discord", "farcaster"] as const;

function shortWallet(wallet: string) {
  return wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "";
}

function fmtDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}


function monthsSince(iso?: string) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function computeScore(proofs: ProofRecord[]) {
  const github = proofs.find((p) => p.platform === "github");
  const discord = proofs.find((p) => p.platform === "discord");
  const farcaster = proofs.find((p) => p.platform === "farcaster");

  const repos = github?.repoCount || 0;
  const commits = github?.commitCount || 0;
  const followers = farcaster?.followerCount || 0;
  const servers = discord?.serverCount || 0;
  const discordAgeMonths = monthsSince(discord?.accountCreatedAt);

  const reposPts = clamp(Math.round((Math.min(repos, 120) / 120) * 25), 0, 25);
  const commitsPts = clamp(Math.round((Math.min(commits, 800) / 800) * 20), 0, 20);
  const agePts = clamp(Math.round((Math.min(discordAgeMonths, 72) / 72) * 20), 0, 20);
  const serversPts = clamp(Math.round((Math.min(servers, 50) / 50) * 10), 0, 10);
  const followersPts = clamp(Math.round((Math.min(followers, 5000) / 5000) * 20), 0, 20);
  const completionPts = clamp(Math.round((proofs.length / 3) * 5), 0, 5);

  const total = reposPts + commitsPts + agePts + serversPts + followersPts + completionPts;

  return {
    total,
    rows: [
      { label: "GitHub repos", value: String(repos), points: reposPts, max: 25 },
      { label: "GitHub commits", value: String(commits), points: commitsPts, max: 20 },
      { label: "Discord age", value: `${discordAgeMonths} months`, points: agePts, max: 20 },
      { label: "Discord servers", value: String(servers), points: serversPts, max: 10 },
      { label: "Farcaster followers", value: String(followers), points: followersPts, max: 20 },
      { label: "Completion", value: `${proofs.length}/3`, points: completionPts, max: 5 },
    ],
  };
}

export default function CertificatePage({ params }: { params: { wallet: string } }) {
  const wallet = params.wallet;
  const { publicKey } = useWallet();
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/proof?wallet=" + wallet, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const serverProofs: ProofRecord[] = Array.isArray(d?.proofs) ? d.proofs : [];
        const ordered = ORDER.map((p) => serverProofs.find((row) => row.platform === p)).filter(
          (row): row is ProofRecord => !!row
        );
        if (active) setProofs(ordered);
      })
      .catch(() => {
        if (active) setProofs([]);
      });

    return () => {
      active = false;
    };
  }, [wallet]);

  const score = useMemo(() => computeScore(proofs), [proofs]);
  const issueDate = proofs.length > 0 ? fmtDate(proofs[proofs.length - 1].verifiedAt) : fmtDate(new Date().toISOString());
  const cardId = useMemo(() => cardIdFromWallet(wallet), [wallet]);
  const topProof = useMemo(() => proofs.find((p) => p.pfpUrl) || proofs[0], [proofs]);
  const topDisplayName = useMemo(() => {
    if (!topProof) return shortWallet(wallet);
    return topProof.fullName || topProof.username || shortWallet(wallet);
  }, [topProof, wallet]);
  const connectedWallet = useMemo(() => publicKey?.toBase58() ?? "", [publicKey]);
  const isOwner = connectedWallet === wallet;

  const shareUrl = typeof window !== "undefined" ? window.location.href : `${APP_URL}/certificate/${wallet}`;
  const storyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/story/${encodeURIComponent(cardId)}`
      : `${APP_URL}/story/${encodeURIComponent(cardId)}`;
  const xText = encodeURIComponent(`My Rialink RialCard score is ${score.total}/100 on Rialo Devnet.`);
  const xUrl = `https://twitter.com/intent/tweet?text=${xText}&url=${encodeURIComponent(shareUrl)}`;
  const storyText = encodeURIComponent("My Rialink verification story is now live.");
  const xStoryUrl = `https://twitter.com/intent/tweet?text=${storyText}&url=${encodeURIComponent(storyUrl)}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 500px at 20% -10%, rgba(92,225,230,0.16), transparent 60%), radial-gradient(900px 500px at 90% 110%, rgba(124,58,237,0.2), transparent 65%), #040815",
        color: "#e6edff",
        padding: "86px 16px 46px",
      }}
    >
      <div style={{ maxWidth: 430, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>RialCard</h1>
        <p style={{ marginTop: 7, color: "rgba(230,237,255,0.78)", fontSize: 13 }}>
          Identity card for {shortWallet(wallet)}
        </p>

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            border: "1px solid rgba(242,225,190,0.45)",
            background: "linear-gradient(155deg, #fff9ec 0%, #f8f0df 52%, #f3e7d2 100%)",
            color: "#1e293b",
            boxShadow: "0 18px 34px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.95)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f766e", fontWeight: 700 }}>
                  Rialink | Rialo
                </div>
                <div style={{ marginTop: 2, fontSize: 30, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{score.total}/100</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#475569" }}>Card ID</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#0f766e", fontWeight: 700 }}>{cardId}</div>
                <div style={{ marginTop: 3, fontSize: 10, color: "#475569" }}>{issueDate}</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                border: "1px solid rgba(15,118,110,0.2)",
                borderRadius: 12,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.72)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {topProof?.pfpUrl ? (
                <img
                  src={topProof.pfpUrl}
                  alt="avatar"
                  style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(15,118,110,0.22)" }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #14b8a6, #38bdf8)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {wallet[0]?.toUpperCase() || "V"}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Profile</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{topDisplayName}</div>
              </div>

              <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 10, color: "#475569" }}>
                <div>Network</div>
                <div style={{ fontWeight: 700, color: "#0f766e" }}>Rialo Devnet</div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {score.rows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(255,255,255,0.75)",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{row.value}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 700 }}>
                    +{row.points}/{row.max}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(15,118,110,0.2)",
              background: "rgba(15,118,110,0.06)",
              padding: "8px 14px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#334155",
            }}
          >
            <span>Non-custodial signal card</span>
            <span>{isOwner ? "Owner-controlled sharing" : "View only"}</span>
          </div>
        </div>

        {isOwner ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <a
              href={xUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 42,
                borderRadius: 10,
                background: "linear-gradient(135deg, #14b8a6, #38bdf8)",
                color: "#ffffff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Share RialCard on X
            </a>

            <a
              href={xStoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 40,
                borderRadius: 10,
                border: "1px solid rgba(92,225,230,0.5)",
                background: "rgba(92,225,230,0.12)",
                color: "#dff9ff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Share Proof Story on X
            </a>

            <button
              onClick={copyLink}
              style={{
                height: 38,
                borderRadius: 10,
                border: "1px solid rgba(146,170,255,0.35)",
                background: "transparent",
                color: "#e6edff",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {copied ? "Copied" : "Copy RialCard link"}
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: 12,
              borderRadius: 10,
              border: "1px solid rgba(146,170,255,0.25)",
              background: "rgba(15,23,42,0.45)",
              padding: "10px 12px",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "rgba(230,237,255,0.85)" }}>
              View-only mode. Sharing controls are available only to the wallet owner.
            </p>
          </div>
        )}

        <a
          href={storyUrl}
          style={{
            marginTop: 10,
            display: "inline-flex",
            color: "#9fe9ff",
            textDecoration: "none",
            fontSize: 12,
          }}
        >
          View Proof Story timeline
        </a>
      </div>
    </div>
  );
}
