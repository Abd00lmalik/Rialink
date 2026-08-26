"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    title: "Connect and sign your wallet challenge",
    body: "A short-lived nonce is issued; you sign one canonical message. Private keys never leave your wallet.",
  },
  {
    num: "02",
    title: "Verify social ownership with one-time sessions",
    body: "GitHub and Discord via OAuth callbacks, Farcaster via signed sign-in. Each session is wallet-bound and single-use.",
  },
  {
    num: "03",
    title: "Create a signed binding proof",
    body: "We derive a deterministic proof hash from wallet + platform + account ID and issue a signed binding proof.",
  },
  {
    num: "04",
    title: "Share and verify trustlessly",
    body: "Your profile and RialCard go live instantly. Integrators verify via API, and identity roots anchor on Rialo for public auditability.",
  },
];

export function ProcessRail() {
  const sectionRef = useRef<HTMLElement>(null);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFill(1);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Start when the rail enters the lower third; finish as its top passes 40% of viewport.
      const start = vh * 0.85;
      const end = vh * 0.35;
      const raw = (start - r.top) / (start - end + r.height * 0.55);
      setFill(Math.max(0, Math.min(1, raw)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const nodeState = (i: number): "done" | "active" | "todo" => {
    const pos = i / (STEPS.length - 1);
    if (fill >= Math.min(1, pos + 0.34)) return "done";
    if (!fill) return i === 0 ? "active" : "todo";
    const activeIdx = Math.round(fill * (STEPS.length - 1));
    return i === activeIdx ? "active" : "todo";
  };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      style={{ maxWidth: 1160, margin: "0 auto", padding: "clamp(72px,10vh,120px) 24px" }}
    >
      <div style={{ marginBottom: 48 }}>
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
          Process
        </p>
        <h2
          style={{
            fontSize: "clamp(26px,3vw,36px)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Four steps
        </h2>
      </div>

      {/* Desktop horizontal rail */}
      <div className="rail-desktop">
        <div
          className="rail-track"
          aria-hidden
          style={{ position: "absolute", top: 21, left: "7%", right: "7%", height: 2, ["--fill" as string]: fill } as React.CSSProperties}
        >
          <div className="rail-fill" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <span className="rail-node tabular" data-state={nodeState(i)} style={{ width: 42, height: 42, fontSize: 13 }}>
                {s.num}
              </span>
              <h3
                style={{
                  fontSize: 15.5,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  margin: "18px 0 8px",
                  maxWidth: 240,
                }}
              >
                {s.title}
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 250 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile vertical spine */}
      <div className="rail-mobile" style={{ position: "relative", maxWidth: 480 }}>
        <div
          className="rail-track"
          aria-hidden
          style={{ position: "absolute", top: 8, bottom: 8, left: 15, width: 2, ["--fill" as string]: fill } as React.CSSProperties}
        >
          <div className="rail-fill" style={{ background: "linear-gradient(180deg, rgba(62,235,220,0.35), var(--accent))", width: "100%", height: `calc(var(--fill) * 100%)` }} />
        </div>

        <div style={{ display: "grid", gap: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: "flex", gap: 18 }}>
              <span className="rail-node tabular" data-state={nodeState(i)} style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                {s.num}
              </span>
              <div>
                <h3 style={{ fontSize: 15.5, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em", margin: "5px 0 6px" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
