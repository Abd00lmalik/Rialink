"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RialCard } from "@/components/landing/RialCard";

function HeroStats() {
  const [stats, setStats] = useState<{ wallets: number; proofs: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <p
      className="tabular"
      style={{
        fontSize: 13,
        color: "var(--text-faint)",
        letterSpacing: "0.01em",
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <span>{stats ? `${stats.wallets.toLocaleString()} wallets verified` : "Wallets verified"}</span>
      <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span>
      <span>{stats ? `${stats.proofs.toLocaleString()} proofs issued` : "Proofs issued"}</span>
      <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span>
      <span>3 platforms</span>
    </p>
  );
}

export function Hero() {
  return (
    <section
      style={{ position: "relative", paddingTop: "clamp(120px, 16vh, 168px)", paddingBottom: "clamp(72px, 9vh, 120px)" }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 24px",
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: "48px",
          alignItems: "center",
        }}
        className="hero-grid"
      >
        {/* Copy */}
        <div>
          <span className="chip-secondary" style={{ marginBottom: 28 }}>
            <span className="pulse-dot" aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: "var(--accent)", display: "inline-block" }} />
            Public beta · Rialo devnet
          </span>

          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
              fontWeight: 400,
              fontSize: "clamp(48px, 6.8vw, 84px)",
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              marginBottom: 22,
            }}
          >
            Proof Over <em style={{ fontStyle: "italic" }}>Persona</em>
          </h1>

          <p
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "var(--text-secondary)",
              maxWidth: 480,
              marginBottom: 32,
            }}
          >
            Bind a wallet to GitHub, Discord, and Farcaster. Issue a portable signed proof anyone can verify, without trusting a profile picture.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
            <Link href="/verify" className="btn-accent">
              Get Verified
            </Link>
            <Link href="/profile/demo" className="btn-quiet">
              View Demo Profile
            </Link>
          </div>

          <HeroStats />
        </div>

        {/* Object */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RialCard />
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 56px !important; }
          .hero-grid > div:last-child { order: 2; }
          .card-scene { max-width: 420px; margin: 0 auto; }
        }
      `}</style>
    </section>
  );
}
