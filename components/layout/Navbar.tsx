'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ConnectButton } from '@/components/wallet/ConnectButton';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/verifier', label: 'Verifier' },
  { href: '/developers', label: 'Developers' },
  { href: '/#faq', label: 'FAQ' },
  { href: 'https://rialo.io', label: 'Docs' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'rgba(10, 11, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          width: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Rialink
          </span>
          <span
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent-text)',
              border: '1px solid rgba(92,225,230,0.15)',
              borderRadius: '6px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            on Rialo
          </span>
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }} className="hide-mobile">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                color: pathname === link.href ? 'var(--text-primary)' : 'var(--text-secondary)',
                transition: 'color 0.12s ease',
              }}
              className="nav-link"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }} className="hide-mobile">
          <Link
            href="/verify"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '38px',
              padding: '0 16px',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background 0.12s ease',
              letterSpacing: '-0.01em',
            }}
            className="btn-primary"
          >
            Get Verified
          </Link>
          <ConnectButton />
        </div>

        <div className="show-mobile-flex" style={{ marginLeft: 'auto', display: 'none', alignItems: 'center', gap: '8px' }}>
          <ConnectButton />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="show-mobile-block"
          style={{
            display: 'none',
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(10, 11, 15, 0.97)',
            padding: '10px 16px 14px',
          }}
        >
          <div style={{ display: 'grid', gap: '8px' }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  color: pathname === link.href ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: 'var(--bg-surface)',
                }}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/verify"
              className="btn-primary"
              style={{
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                fontWeight: 500,
              }}
            >
              Get Verified
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
