"use client";

import { Github } from "lucide-react";

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function FarcasterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm3.107 4.5h-6.25v3.214H4.679v8.572h3.571V19.5h7.5v-3.214h3.571V7.714h-4.214V4.5z" />
    </svg>
  );
}

const PLATFORMS = [
  {
    key: "github",
    icon: Github,
    stroke: true,
    name: "GitHub",
    tag: "Free",
    description: "Bind your developer identity. We confirm your username and public repository count.",
    note: "OAuth 2.0 · read:user scope only",
  },
  {
    key: "discord",
    icon: DiscordIcon,
    stroke: false,
    name: "Discord",
    tag: "Free",
    description: "Bind your community identity. Confirm your username and account legitimacy.",
    note: "OAuth 2.0 · identify scope only",
  },
  {
    key: "farcaster",
    icon: FarcasterIcon,
    stroke: false,
    name: "Farcaster",
    tag: "Free",
    description: "Native web3 identity. Sign in with your wallet, no OAuth keys involved.",
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
                <span className="icon-well" style={{ color: "var(--text-secondary)" }}>
                  {p.stroke ? (
                    <Icon size={20} strokeWidth={1.75} />
                  ) : (
                    <Icon size={19} />
                  )}
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
