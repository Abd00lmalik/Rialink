"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Is my personal data stored on-chain?",
    a: "No. We do not store your email or real name. Proofs are hashes derived from your wallet address and a platform account ID — never readable personal data.",
  },
  {
    q: "What exactly is a proof hash?",
    a: "A proof hash is a 64-character fingerprint of the statement: wallet W is linked to platform account ID X. It is not your username, and it is not readable personal data.",
  },
  {
    q: "What is a root hash?",
    a: "A root hash is one summary hash built from your per-platform proof hashes. It gives DAOs a one-value check for a wallet's verification state — and it is what gets anchored on Rialo.",
  },
  {
    q: "Can I remove a verification?",
    a: "Yes. Disconnect the platform from your dashboard and it is removed from your Rialink record; revocations are published as on-chain receipts once anchoring is active.",
  },
  {
    q: "Why Rialo?",
    a: "Rialo lets us make verification trust-minimized over time: Phase 1 anchors root hashes for public auditability; Phase 2 moves verification logic itself on-chain, so no backend holds the hard truth.",
  },
  {
    q: "Is this free?",
    a: "Yes during beta. Once on-chain anchoring is live, publishing a root hash costs only the small Rialo network fee.",
  },
  {
    q: "What is Farcaster?",
    a: "Farcaster is a decentralized social network where identity is controlled by your wallet. Sign In With Farcaster proves your account without OAuth keys.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(72px,10vh,120px) 24px clamp(72px,10vh,110px)" }}>
      <h2
        style={{
          fontSize: "clamp(26px,3vw,36px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          marginBottom: 32,
        }}
      >
        Common questions
      </h2>

      <div className="faq-panel">
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="faq-row" data-open={isOpen}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "18px 22px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
                    letterSpacing: "-0.01em",
                    transition: "color 0.2s ease",
                  }}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden
                  style={{
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.24s ease",
                  }}
                />
              </button>
              <div className="faq-answer" id={`faq-answer-${i}`} role="region">
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      padding: "0 44px 20px 22px",
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
