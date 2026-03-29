'use client';

const SOCIAL_LINKS = [
  { label: '@Rialo', href: 'https://x.com/RialoHQ' },
  { label: '@Mr.Ghost', href: 'https://x.com/Abd00lmalik' },
];

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '32px 0',
        marginTop: '80px',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div className="footer-social-left" style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <a
              href={SOCIAL_LINKS[0].href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '14px', color: 'var(--text-muted)', transition: 'color 0.12s ease' }}
              className="footer-link"
            >
              {SOCIAL_LINKS[0].label}
            </a>
          </div>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            Built by Mr.Ghost
          </p>

          <div className="footer-social-right" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a
              href={SOCIAL_LINKS[1].href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '14px', color: 'var(--text-muted)', transition: 'color 0.12s ease' }}
              className="footer-link"
            >
              {SOCIAL_LINKS[1].label}
            </a>
          </div>
        </div>

        <div
          className="footer-meta-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
            Rialink
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            2026 Rialink Built on Rialo Open source
          </p>
        </div>
      </div>
    </footer>
  );
}
