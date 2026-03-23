'use client';

const STEPS = [
  {
    num: '01',
    title: 'Connect your wallet',
    body: ' No email, no password, no personal data.',
  },
  {
    num: '02',
    title: 'Link your accounts',
    body: 'OAuth into GitHub or Discord, or use Sign In With Farcaster. We only read your public profile ID — never your private data.',
  },
  {
    num: '03',
    title: 'Proof stored on-chain',
    body: 'A SHA-256 hash of your proof is stored on the Rialo blockchain. Your username is never on-chain — only the cryptographic fingerprint.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px 80px' }}>
      <div style={{ maxWidth: '560px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Process
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)', marginBottom: '32px' }}>
          Three steps
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((step, i) => (
            <div key={step.num} style={{ display: 'flex', gap: '20px', position: 'relative' }}>
              {/* Left: number + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {step.num}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, width: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />
                )}
              </div>

              {/* Right: content */}
              <div style={{ paddingBottom: i < STEPS.length - 1 ? '28px' : '0', flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '6px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
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
