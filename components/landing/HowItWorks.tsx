"use client";

const STEPS = [
  {
    num: "01",
    title: "Connect and sign your wallet challenge",
    body: "Rialink issues a short-lived nonce. You sign a canonical wallet message so we can prove wallet ownership without exposing private keys.",
  },
  {
    num: "02",
    title: "Verify social ownership with one-time sessions",
    body: "GitHub and Discord use OAuth callbacks; Farcaster uses signed wallet-based sign-in. Each verification session is wallet-bound, short-lived, and one-time-use.",
  },
  {
    num: "03",
    title: "Create a signed binding proof",
    body: "We compute a deterministic proof hash from (wallet + platform + platform user ID) and issue a signed binding proof token that can be verified independently.",
  },
  {
    num: "04",
    title: "Share and verify trustlessly",
    body: "Your verifier profile and VM Card become shareable immediately. Integrators can verify proofs via API today, then anchor identity roots on Rialo for permanent on-chain auditability.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 24px 80px" }}>
      <div style={{ maxWidth: "560px" }}>
        <p style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "8px" }}>
          Process
        </p>
        <h2 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "32px" }}>
          Four steps
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {STEPS.map((step, i) => (
            <div key={step.num} style={{ display: "flex", gap: "20px", position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text-muted)", fontWeight: 400 }}>
                  {step.num}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, width: "1px", background: "var(--border-subtle)", margin: "8px 0" }} />
                )}
              </div>

              <div style={{ paddingBottom: i < STEPS.length - 1 ? "28px" : "0", flex: 1 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: "6px" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

