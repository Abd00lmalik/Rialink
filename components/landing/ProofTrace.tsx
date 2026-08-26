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

interface Pt {
  x: number;
  y: number;
}

interface Geom {
  d: string;
  anchorLens: number[];
  total: number;
  anchors: Pt[];
  w: number;
  h: number;
}

function buildGeometry(wrap: HTMLElement, plates: HTMLElement[], desktop: boolean): Geom {
  const wr = wrap.getBoundingClientRect();
  const anchors = plates.map((el, i) => {
    const r = el.getBoundingClientRect();
    const innerRight = i % 2 === 0; // left column plates connect on their right edge
    const x = innerRight ? r.right - wr.left + 20 : r.left - wr.left - 20;
    const mobileX = innerRight ? r.right - wr.left + 14 : r.left - wr.left - 14;
    return {
      x: desktop ? x : mobileX,
      y: r.top - wr.top + r.height / 2,
    };
  });

  const a = anchors;
  const start: Pt = desktop
    ? { x: a[0].x - 150, y: Math.max(8, a[0].y - 130) }
    : { x: a[0].x, y: Math.max(8, a[0].y - 70) };

  const mid = (p: Pt, q: Pt): Pt => ({ x: p.x, y: p.y + (q.y - p.y) * 0.45 });
  const tail: Pt = { x: a[3].x, y: a[3].y + (desktop ? 90 : 60) };

  const pts: Pt[] = [start, a[0], mid(a[0], a[1]), a[1], mid(a[1], a[2]), a[2], mid(a[2], a[3]), a[3], tail];
  const d = "M " + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");

  // Cumulative length at each anchor (pts indices 1,3,5,7).
  const anchorLens: number[] = [];
  let acc = 0;
  let anchorIdx = 0;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const q = pts[i];
    acc += Math.hypot(q.x - p.x, q.y - p.y);
    if (i % 2 === 1) {
      anchorLens[anchorIdx++] = acc;
    }
  }

  return { d, anchorLens, total: acc, anchors: a, w: wr.width, h: wr.height };
}

export function ProofTrace() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef<(HTMLElement | null)[]>([]);
  const drawRef = useRef<SVGPathElement>(null);
  const [geom, setGeom] = useState<Geom | null>(null);
  const [fill, setFill] = useState(0);

  // Geometry: measured from real DOM positions, rebuilt on resize.
  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const plates = plateRefs.current.filter(Boolean) as HTMLElement[];
      if (plates.length !== STEPS.length) return;
      const desktop = window.matchMedia("(min-width: 901px)").matches;
      setGeom(buildGeometry(wrap, plates, desktop));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Scroll-linked draw.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFill(1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const raw = (start - r.top) / (r.height + vh * 0.1);
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

  // Map fill to stroke-dashoffset.
  useEffect(() => {
    const p = drawRef.current;
    if (!p || !geom) return;
    p.style.strokeDasharray = `${geom.total}`;
    p.style.strokeDashoffset = `${geom.total * (1 - fill)}`;
  }, [geom, fill]);

  const nodeState = (i: number): "done" | "active" | "todo" => {
    if (!geom) return i === 0 ? "active" : "todo";
    const drawn = fill * geom.total;
    if (drawn >= geom.anchorLens[i] - 1) return "done";
    const prev = i === 0 ? 0 : geom.anchorLens[i - 1];
    if (drawn >= prev) return "active";
    return "todo";
  };

  return (
    <section
      id="how-it-works"
      style={{ maxWidth: 1160, margin: "0 auto", padding: "clamp(72px,10vh,120px) 24px" }}
    >
      <div style={{ marginBottom: 56 }}>
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

      <div ref={wrapRef} className="trace-wrap">
        {geom && (
          <svg
            className="trace-svg"
            width={geom.w}
            height={geom.h}
            viewBox={`0 0 ${geom.w} ${geom.h}`}
            aria-hidden
          >
            {/* Upcoming stroke */}
            <path d={geom.d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* Completed stroke */}
            <path
              ref={drawRef}
              d={geom.d}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Nodes */}
            {geom.anchors.map((p, i) => {
              const state = nodeState(i);
              return (
                <g key={i}>
                  {state === "active" && (
                    <circle cx={p.x} cy={p.y} r={11} fill="none" stroke="var(--accent)" strokeOpacity={0.25} strokeWidth={2} />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={5.5}
                    fill="#0B0F16"
                    stroke={state === "todo" ? "rgba(255,255,255,0.25)" : "var(--accent)"}
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>
        )}

        <div className="trace-grid">
          {STEPS.map((s, i) => {
            const state = nodeState(i);
            return (
              <article
                key={s.num}
                ref={(el) => {
                  plateRefs.current[i] = el;
                }}
                className="glass-card trace-plate"
                style={{
                  padding: "22px 24px",
                  gridColumn: i % 2 === 0 ? 1 : 2,
                  justifySelf: i % 2 === 0 ? "start" : "end",
                  marginLeft: i % 2 === 1 ? "28px" : 0,
                  marginRight: i % 2 === 0 ? "28px" : 0,
                  maxWidth: 470,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span
                    className="tabular"
                    style={{
                      fontSize: 12,
                      fontFamily: "ui-monospace, Menlo, monospace",
                      letterSpacing: "0.08em",
                      color: state === "todo" ? "var(--text-faint)" : "var(--accent-text)",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {s.num}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      height: 1,
                      flex: 1,
                      background:
                        state === "todo" ? "var(--border-subtle)" : "rgba(62,235,220,0.35)",
                      transition: "background 0.3s ease",
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                    marginBottom: 8,
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>{s.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
