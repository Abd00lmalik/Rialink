"use client";

import { useEffect, useRef } from "react";

const DEMO = {
  score: 68,
  cardId: "VM-00AG219K-E3PK",
  issued: "2026-08-26",
  wallet: "7xKmW3…E3pk",
  glyph: "7",
  network: "Rialo Testnet",
  signals: [
    { label: "GitHub repos", value: "18", points: "+18/25", pct: 0.72 },
    { label: "GitHub commits", value: "240", points: "+20/20", pct: 1 },
    { label: "Discord age", value: "27 mo", points: "+20/20", pct: 1 },
    { label: "Discord servers", value: "12", points: "+10/10", pct: 1 },
    { label: "Farcaster followers", value: "86", points: "+20/20", pct: 0.8 },
    { label: "Completion", value: "2/3", points: "+4/5", pct: 0.4 },
  ],
};

function SignalBar({ pct }: { pct: number }) {
  return (
    <div
      aria-hidden
      style={{
        height: 3,
        borderRadius: 99,
        background: "rgba(23,26,33,0.10)",
        overflow: "hidden",
        flex: 1,
        margin: "0 12px",
      }}
    >
      <div
        style={{
          width: `${Math.round(pct * 100)}%`,
          height: "100%",
          borderRadius: 99,
          background:
            pct >= 1 ? "#171A21" : "linear-gradient(90deg,#171A21,#2E6B63)",
          opacity: 0.85,
        }}
      />
    </div>
  );
}

export function RialCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const card = cardRef.current;
    if (!scene || !card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Base three-quarter pose from the stylesheet; tilt is a delta on top.
    const BASE_RX = 6;
    const BASE_RY = -11;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let active = false;

    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

    const tick = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      card.style.setProperty("--rx", `${BASE_RX + curX}deg`);
      card.style.setProperty("--ry", `${BASE_RY + curY}deg`);
      if (active || Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      targetX = clamp(-py * 8, 8); // max ±8° pitch
      targetY = clamp(px * 8, 8);  // max ±8° yaw
      active = true;
      start();
    };
    const onLeave = () => {
      active = false;
      targetX = 0;
      targetY = 0; // spring back to base pose
      start();
    };

    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerleave", onLeave);
    scene.addEventListener("pointercancel", onLeave);
    return () => {
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
      scene.removeEventListener("pointercancel", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={sceneRef} className="card-scene" style={{ touchAction: "pan-y" }}>
      <div className="card-float">
        <div ref={cardRef} className="rialcard" role="img" aria-label="Rialink signal card demo: score 68 of 100, GitHub, Discord and Farcaster signals for a sample wallet">
          <div className="rialcard-face">
            {/* Top row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "#171A21",
                }}
              >
                RIALINK <span style={{ opacity: 0.45 }}>|</span> RIALO
              </span>
              <span style={{ fontSize: 10, fontFamily: "ui-monospace, Menlo, monospace", color: "rgba(23,26,33,0.55)", textAlign: "right", lineHeight: 1.5 }}>
                {DEMO.cardId}
                <br />
                {DEMO.issued}
              </span>
            </div>

            {/* Score */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
              <span
                className="tabular"
                style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, color: "#12151C" }}
              >
                {DEMO.score}
              </span>
              <span className="tabular" style={{ fontSize: 16, fontWeight: 500, color: "rgba(23,26,33,0.5)" }}>
                /100
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "rgba(23,26,33,0.45)",
                }}
              >
                Trust score
              </span>
            </div>

            {/* Profile row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(23,26,33,0.05)",
                border: "1px solid rgba(23,26,33,0.08)",
                marginBottom: 14,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#171A21",
                  color: "#F4F2E9",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {DEMO.glyph}
              </span>
              <span style={{ fontSize: 12.5, fontFamily: "ui-monospace, Menlo, monospace", color: "#171A21" }}>
                {DEMO.wallet}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(23,26,33,0.55)" }}>
                Network · <strong style={{ fontWeight: 600 }}>{DEMO.network}</strong>
              </span>
            </div>

            {/* Signals */}
            <div style={{ display: "grid", gap: 7 }}>
              {DEMO.signals.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(23,26,33,0.65)", width: 118, flexShrink: 0 }}>
                    {s.label}
                  </span>
                  <SignalBar pct={s.pct} />
                  <span
                    className="tabular"
                    style={{ fontSize: 11.5, fontWeight: 600, color: "#171A21", width: 34, textAlign: "right" }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="tabular"
                    style={{
                      fontSize: 10,
                      fontFamily: "ui-monospace, Menlo, monospace",
                      color: s.pct >= 1 ? "#1E5A50" : "rgba(23,26,33,0.55)",
                      width: 52,
                      textAlign: "right",
                    }}
                  >
                    {s.points}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 10,
                borderTop: "1px solid rgba(23,26,33,0.10)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(23,26,33,0.5)",
              }}
            >
              <span>Non-custodial signal card</span>
              <span>View only</span>
            </div>
          </div>
        </div>

        {/* Contact shadow */}
        <div
          aria-hidden
          style={{
            height: 22,
            margin: "26px auto 0",
            width: "62%",
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(0,0,0,0.5), transparent)",
            filter: "blur(6px)",
          }}
        />
      </div>
    </div>
  );
}
