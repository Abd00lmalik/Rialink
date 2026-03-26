"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

function HeroStats() {
  const [stats, setStats] = useState<{ wallets: number; proofs: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  if (!stats) return <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>- wallets verified | - proofs | 3 platforms</p>;

  return (
    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
      {stats.wallets.toLocaleString()} wallets verified | {stats.proofs.toLocaleString()} proofs | 3 platforms
    </p>
  );
}

export function Hero() {
  return (
    <section style={{ paddingTop: "120px", paddingBottom: "80px", textAlign: "center" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "32px" }}>
          <span style={{ background: "var(--accent-muted)", color: "var(--accent-text)", border: "1px solid rgba(92,225,230,0.15)", borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <span className="pulse-dot" style={{ color: "var(--accent)" }}>*</span>
            Live on Rialo Devnet
          </span>
        </div>

        <h1 style={{ fontSize: "52px", fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "20px" }}>
          Proof Over Persona
        </h1>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
          <Link href="/verify" style={{ display: "inline-flex", alignItems: "center", height: "42px", padding: "0 20px", background: "var(--accent)", color: "var(--text-inverse)", borderRadius: "10px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em", transition: "background 0.12s ease" }} className="btn-primary">
            Get Verified
          </Link>
          <Link href="/profile/demo" style={{ display: "inline-flex", alignItems: "center", height: "42px", padding: "0 20px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)", borderRadius: "10px", fontSize: "15px", fontWeight: 500, letterSpacing: "-0.01em" }} className="btn-ghost">
            View Demo Profile
          </Link>
        </div>

        <HeroStats />
      </div>
    </section>
  );
}
