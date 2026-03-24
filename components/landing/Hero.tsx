'use client';

import Link from 'next/link';

function HeroStats() {
  const [stats, setStats] = useState<{ wallets: number; proofs: number } | null>(null);
  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);
  if (!stats) return <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>— wallets verified · — proofs · 3 platforms</p>;
  return (
    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
      {stats.wallets.toLocaleString()} wallets verified · {stats.proofs.toLocaleString()} proofs · 3 platforms
    </p>
  );
}

export function Hero() {
  return (
    <section style={{ paddingTop: '120px', paddingBottom: '80px', textAlign: 'center' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px' }}>
        {/* Live pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
          <span style={{
            background: 'var(--accent-muted)', color: 'var(--accent-text)',
            border: '1px solid rgba(92,225,230,0.15)',
            borderRadius: '999px', padding: '4px 10px',
            fontSize: '12px', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: '5px',
          }}>
            <span className="pulse-dot" style={{ color: 'var(--accent)' }}>â—</span>
            Live on Rialo Devnet
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: '52px', fontWeight: 500, lineHeight: 1.15,
          letterSpacing: '-0.02em', color: 'var(--text-primary)',
          marginBottom: '20px',
        }}>
          Your identity.<br />
          Cryptographically proven.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontSize: '16px', color: 'var(--text-secondary)',
          maxWidth: '480px', margin: '0 auto 32px',
          lineHeight: 1.65,
        }}>
          Link your GitHub, Discord, and Farcaster accounts to your wallet.
          No real name. No email stored. Just proof â€” permanent and verifiable on Rialo.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <Link
            href="/verify"
            style={{
              display: 'inline-flex', alignItems: 'center', height: '42px', padding: '0 20px',
              background: 'var(--accent)', color: 'var(--text-inverse)',
              borderRadius: '10px', fontSize: '15px', fontWeight: 500,
              letterSpacing: '-0.01em', transition: 'background 0.12s ease',
            }}
            className="btn-primary"
          >
            Get Verified â†’
          </Link>
          <Link
            href="/profile/demo"
            style={{
              display: 'inline-flex', alignItems: 'center', height: '42px', padding: '0 20px',
              background: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px', fontSize: '15px', fontWeight: 500,
              letterSpacing: '-0.01em', transition: 'color 0.12s ease, background 0.12s ease, border-color 0.12s ease',
            }}
            className="btn-ghost"
          >
            View Demo Profile
          </Link>
        </div>

        {/* Stats row */}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          1,247 wallets verified Â· 3,891 proofs Â· 3 platforms
        </p>
      </div>
    </section>
  );
}



