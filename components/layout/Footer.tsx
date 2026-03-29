'use client';

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      padding: '32px 0',
      marginTop: '80px',
    }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Rialink</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['GitHub', 'Twitter', 'Discord'].map((link) => (
              <a
                key={link}
                href="#"
                style={{ fontSize: '14px', color: 'var(--text-muted)', transition: 'color 0.12s ease' }}
                className="footer-link"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
           2025 Rialink  Built on Rialo  Not affiliated with Rialo Protocol  Open source
        </p>
      </div>
    </footer>
  );
}


