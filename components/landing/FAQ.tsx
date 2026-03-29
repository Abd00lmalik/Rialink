"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Is my personal data stored on-chain?",
    a: "No. We do not store your email or real name. Proofs are hashes derived from your wallet address and a platform account ID. Today we persist proofs in our database for reliability; anchoring on Rialo is the next step.",
  },
  {
    q: "What exactly is a proof hash?",
    a: "A proof hash is a 64-character fingerprint of the statement: wallet W is linked to platform account ID X. It is not your username, and it is not readable personal data.",
  },
  {
    q: "What is a root hash?",
    a: "A root hash is one summary hash built from your per-platform proof hashes. It gives DAOs a one-value check for a wallet's verification state, and it is what we plan to anchor on Rialo.",
  },
  {
    q: "Can I remove a verification?",
    a: "Yes. You can disconnect a platform from your dashboard. In beta this removes it from your Rialink record; once anchoring is enabled, it will publish an update as well.",
  },
  {
    q: "Why Rialo?",
    a: "Rialo lets us make verification more trust-minimized over time: Phase 1 anchors root hashes; Phase 2 moves the verification logic on-chain (so we do not need a backend to do the hard work).",
  },
  {
    q: "Is this free?",
    a: "Yes during beta. Once on-chain anchoring is live, users will pay a small network fee to publish their root hash.",
  },
  {
    q: "What is Farcaster?",
    a: "Farcaster is a decentralized social network where your identity is controlled by your wallet. Sign In With Farcaster lets you prove your Farcaster identity without OAuth keys.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" style={{ maxWidth: "640px", margin: "0 auto", padding: "0 24px 80px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "24px" }}>
        Common questions
      </h2>
      <div>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
              className="faq-btn"
            >
              <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em", paddingRight: "16px" }}>
                {faq.q}
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.12s ease",
                }}
              />
            </button>
            {open === i && (
              <div style={{ paddingBottom: "16px" }}>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {faq.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

