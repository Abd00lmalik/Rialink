'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { clearStoredWalletProof } from '@/hooks/useWalletProof';
import { truncateAddress, generateAvatarColor } from '@/lib/utils';
import { cardIdFromWallet } from '@/lib/card-id';

export function ConnectButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { copy, copied } = useCopyToClipboard();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // NOT CONNECTED STATE
  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '38px',
          padding: '0 16px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
          transition:
            'color 0.12s ease, background 0.12s ease, border-color 0.12s ease',
          fontFamily: 'inherit',
        }}
      >
        Connect wallet
      </button>
    );
  }

  // CONNECTED STATE
  const address = publicKey.toBase58();
  const verifierCardId = cardIdFromWallet(address);
  const avatarColor = generateAvatarColor(address);
  const initial = address[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          height: '38px',
          padding: '0 12px',
          borderRadius: '10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          cursor: 'pointer',
          transition:
            'border-color 0.12s ease, background 0.12s ease',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: avatarColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {initial}
        </div>

        <span
          style={{
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
          }}
        >
          {truncateAddress(address)}
        </span>

        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '14px',
            padding: '6px',
            minWidth: '180px',
            zIndex: 100,
          }}
        >
          {/* FIXED LINK */}
          <a
            href={`/verifier?cardId=${encodeURIComponent(verifierCardId)}`}
            onClick={() => setDropdownOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} />
            Open verifier
          </a>

          <button
            onClick={() => {
              copy(address);
              setDropdownOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '100%',
              background: 'none',
              border: 'none',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy address'}
          </button>

          <div
            style={{
              height: '1px',
              background: 'var(--border-subtle)',
              margin: '4px 0',
            }}
          />

          <button
            onClick={() => {
              disconnect();
              clearStoredWalletProof(address);
              setDropdownOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--error)',
              cursor: 'pointer',
              width: '100%',
              background: 'none',
              border: 'none',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
