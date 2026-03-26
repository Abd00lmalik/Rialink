'use client';

import { Github, MessageSquare, Hexagon } from 'lucide-react';

const PLATFORMS = [
  {
    key: 'github',
    icon: Github,
    name: 'GitHub',
    colorVar: 'var(--github)',
    borderColor: '#7C3AED',
    tag: 'Free',
    description: 'Verify your developer identity. We confirm your username and public repository count.',
    note: 'OAuth 2.0  read:user scope only',
    extraTag: null,
  },
  {
    key: 'discord',
    icon: MessageSquare,
    name: 'Discord',
    colorVar: 'var(--discord)',
    borderColor: '#5865F2',
    tag: 'Free',
    description: 'Verify your community identity. Confirm your username and account legitimacy.',
    note: 'OAuth 2.0  identify scope only',
    extraTag: null,
  },
  {
    key: 'farcaster',
    icon: Hexagon,
    name: 'Farcaster',
    colorVar: 'var(--farcaster)',
    borderColor: '#855DCD',
    tag: 'Free',
    description: 'Native Web3 identity. Sign in with your wallet via Farcaster. No OAuth keys needed.',
    note: 'Sign In With Farcaster  wallet-based',
    extraTag: 'No API keys',
  },
];

export function PlatformShowcase() {
  return (
    <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px 80px' }}>
      {/* Label + heading */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Verified Identities
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: '6px' }}>
          What you can verify
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Three platforms. All free. Permanent proof on Rialo.
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className="platform-showcase-card"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderLeft: `3px solid ${p.borderColor}`,
                borderRadius: '14px',
                padding: '20px',
                transition: 'background 0.12s ease, border-color 0.12s ease',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={20} style={{ color: p.colorVar }} />
                <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                  {p.name}
                </span>
                <span style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  color: 'var(--text-muted)', borderRadius: '6px', padding: '2px 7px', fontSize: '11px',
                }}>
                  {p.tag}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
                {p.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.note}</span>
                {p.extraTag && (
                  <span style={{
                    background: 'var(--accent-muted)', color: 'var(--accent-text)',
                    borderRadius: '6px', padding: '2px 6px', fontSize: '11px',
                  }}>
                    {p.extraTag}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

