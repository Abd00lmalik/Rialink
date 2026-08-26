"use client";

import { useEffect, useState } from "react";

interface Stats {
  wallets: number;
  proofs: number;
  platforms: number;
}

export function Metrics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.wallets === "number" && typeof d.proofs === "number") {
          setStats(d);
          setOk(true);
        } else {
          setOk(false);
        }
      })
      .catch(() => setOk(false));
  }, []);

  const items = [
    { label: "Verified Wallets", value: stats && ok ? stats.wallets.toLocaleString() : null },
    { label: "Proofs Issued", value: stats && ok ? stats.proofs.toLocaleString() : null },
    { label: "Platforms Supported", value: stats ? String(stats.platforms) : "3" },
  ];

  return (
    <section
      aria-label="Network metrics"
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: "clamp(56px,8vh,88px) 24px",
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
        {items.map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center", padding: "8px 0" }}>
            <p
              className="tabular"
              style={{
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: value === null ? "var(--text-faint)" : "var(--text-primary)",
                marginBottom: 6,
                minHeight: 38,
              }}
            >
              {value ?? "—"}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text-faint)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
