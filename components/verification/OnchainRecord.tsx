'use client';

import { Button } from '@/components/ui/Button';
import { EXPLORER_URL } from '@/lib/constants';
import { truncateAddress, formatDate } from '@/lib/utils';
import type { ProofRecord } from '@/lib/types';

interface OnchainRecordProps {
  wallet: string;
  proofs: ProofRecord[];
}

const CONTRACT_DISPLAY = 'RmeW7x...K9pq';
const LATEST_BLOCK = '148,392';

export function OnchainRecord({ wallet, proofs }: OnchainRecordProps) {
  const latestProof = proofs.sort(
    (a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
  )[0];

  const timestamp = latestProof
    ? new Date(latestProof.verifiedAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : '';

  const rows = [
    { key: 'Network', value: 'Rialo Devnet' },
    { key: 'Contract', value: CONTRACT_DISPLAY },
    { key: 'Transactions', value: `${proofs.length} (one per platform)` },
    { key: 'Latest block', value: `#${LATEST_BLOCK}` },
    { key: 'Timestamp', value: timestamp },
    { key: 'Status', value: ' Confirmed' },
  ];

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: '14px', padding: '20px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '12px' }}>
        On-Chain Record
      </p>
      <div style={{
        background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
        borderRadius: '10px', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        {rows.map((row) => (
          <div key={row.key} style={{ display: 'flex', gap: '16px', fontSize: '13px', fontFamily: 'monospace' }}>
            <span style={{ color: 'var(--accent-text)', fontWeight: 500, width: '120px', flexShrink: 0 }}>
              {row.key}:
            </span>
            <span style={{ color: row.key === 'Status' ? 'var(--success)' : 'var(--text-secondary)' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px' }}>
        <a
          href={`${EXPLORER_URL}/address/${wallet}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '38px', borderRadius: '10px',
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)', fontSize: '14px', fontWeight: 500,
            transition: 'color 0.12s ease, background 0.12s ease, border-color 0.12s ease',
          }}
          className="btn-ghost"
        >
          View on Rialo Explorer 
        </a>
      </div>
    </div>
  );
}

