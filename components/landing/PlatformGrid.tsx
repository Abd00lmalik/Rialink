"use client";

import { Github, MessageSquare, Hexagon } from "lucide-react";

const PLATFORMS = [
  {
    key: "github",
    icon: Github,
    name: "GitHub",
    tag: "Free",
    description: "Bind your developer identity. We confirm your username and public repository count.",
    note: "OAuth 2.0 · read:user scope only",
  },
  {
    key: "discord",
    icon: MessageSquare,
    name: "Discord",
    tag: "Free",
    description: "Bind your community identity. Confirm your username and account legitimacy.",
    note: "OAuth 2.0 · identify scope only",
  },
  {
    key: "farcaster",
    icon: Hexagon,
    name: "Farcaster",
    tag: "Free",
    description: "Native web3 identity. Sign in with your wallet — no OAuth keys involved.",
    note: "Sign In With Farcaster · wallet-based",
  },
];

export function PlatformGrid() {
  return (
    <section id="platforms" style={{ maxWidth: 1160, margin: "0 auto", padding: "clamp(72px,10vh,120px) 24px" }}>
      <div style={{ marginBottom: 40 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-faint)",
            marginBottom: 10,
          }}
        >
          Verified identities
        </p>
        <h2
          style={{
            fontSize: "clamp(26px,3vw,36px)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          What you can verify
        </h2>
        <p style={{ fontSize: 16, color: "var(--text-secondary)" }}>
          Three platforms. One portable proof.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <article
              key={p.key}
              className="glass-card"
              style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="icon-well">
                  <Icon size={20} strokeWidth={1.75} style={{ color: "var(--text-secondary)" }} />
                </span>
                <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", flex: 1, letterSpacing: "-0.01em" }}>
                  {p.name}
                </span>
                <span className="chip-secondary" style={{ padding: "3px 9px", fontSize: 11 }}>
                  {p.tag}
                </span>
              </div>

              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.65, flex: 1 }}>
                {p.description}
              </p>

              <p style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "ui-monospace, Menlo, monospace" }}>
                {p.note}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
