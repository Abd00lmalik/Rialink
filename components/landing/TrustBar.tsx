"use client";
import { useEffect, useState } from "react";

interface Stats { wallets: number; proofs: number; platforms: number; }

function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const step = Math.ceil(value / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

export function TrustBar() {
  const [stats, setStats] = useState<Stats>({ wallets: 0, proofs: 0, platforms: 3 });
  const [loaded, setLoaded] = useState(false);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && typeof d.wallets === "number" && typeof d.proofs === "number") {
          setStats(d);
          setOk(true);
        } else {
          setOk(false);
        }
        setLoaded(true);
      })
      .catch(() => { setOk(false); setLoaded(true); });
  }, []);

  const items = [
    { label: "Verified Wallets", value: ok ? stats.wallets : null },
    { label: "Proofs Issued", value: ok ? stats.proofs : null },
    { label: "Platforms Supported", value: stats.platforms },
  ];

  return (
    <section style={{ padding: "48px 24px", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", textAlign: "center" }}>
        {items.map(({ label, value }) => (
          <div key={label}>
            <p style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "4px" }}>
              {!loaded ? "" : value === null ? "—" : <Counter value={value} />}
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

