'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export function WalletModal() {
  const { wallets, select, connecting } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted || !visible) return null;

  const detected = wallets.filter(w =>
    w.readyState === 'Installed' || w.readyState === 'Loadable'
  );

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#13161F',
          border: '1px solid #252838',
          borderRadius: '14px',
          padding: '24px',
          width: '380px',
          maxWidth: '90vw',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '20px',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 500, color: '#E8EAFF' }}>
            Connect wallet
          </span>
          <button
            onClick={() => setVisible(false)}
            aria-label="Close wallet modal"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6B7299', fontSize: '20px', lineHeight: 1,
              padding: '4px',
            }}
          >
            x
          </button>
        </div>

        {detected.length === 0 && (
          <div style={{ color: '#6B7299', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            No wallets detected. Install Phantom or Solflare.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {detected.map(wallet => (
            <button
              key={wallet.adapter.name}
              onClick={async () => {
                try {
                  select(wallet.adapter.name);
                  setVisible(false);
                  await wallet.adapter.connect();
                } catch (e) {
                  console.error(e);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '10px',
                background: '#16181F', border: '1px solid #1E2030',
                cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'background 0.12s ease, border-color 0.12s ease',
                color: '#E8EAFF', fontSize: '14px', fontWeight: 500,
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#1C1E27';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2E42';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#16181F';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2030';
              }}
            >
              {wallet.adapter.icon && (
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                />
              )}
              <span>{wallet.adapter.name}</span>
              <span style={{
                marginLeft: 'auto', fontSize: '12px', color: '#34D399',
              }}>
                Detected
              </span>
            </button>
          ))}
        </div>

        <p style={{
          marginTop: '16px', fontSize: '12px',
          color: '#3D4266', textAlign: 'center',
        }}>
          By connecting you agree to the terms of service
        </p>
      </div>
    </div>
  );
}
