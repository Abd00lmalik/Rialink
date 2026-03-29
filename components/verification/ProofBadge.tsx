'use client';

import { Github, MessageSquare, Hexagon, Check } from 'lucide-react';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import type { VerificationState } from '@/lib/types';

const PLATFORM_ICONS = {
  github: Github,
  discord: MessageSquare,
  farcaster: Hexagon,
};

const PLATFORM_COLORS: Record<string, string> = {
  github: 'var(--github)',
  discord: 'var(--discord)',
  farcaster: 'var(--farcaster)',
};

interface ProofBadgeProps {
  wallet: string;
  verifications: VerificationState[];
}

export function ProofBadge({ wallet, verifications }: ProofBadgeProps) {
  const verifiedCount = verifications.filter((v) => v.status === 'verified').length;
  const allVerified = verifiedCount === 3;

  return (
    <div style={{
      width: '340px',
      background: 'var(--bg-elevated)',
      border: '1px solid rgba(92,225,230,0.3)',
      borderRadius: '14px',
      padding: '16px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Rialink</span>
        <span style={{
          background: 'var(--accent-muted)', color: 'var(--accent-text)',
          borderRadius: '6px', padding: '2px 6px', fontSize: '11px',
        }}>
          on Rialo
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '10px' }} />

      {/* Address */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <AddressDisplay address={wallet} />
      </div>

      {/* Platform icons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '12px' }}>
        {(['github', 'discord', 'farcaster'] as const).map((platform) => {
          const Icon = PLATFORM_ICONS[platform];
          const isVerified = verifications.find((v) => v.platform === platform)?.status === 'verified';
          return (
            <div key={platform} style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon
                size={20}
                style={{ color: isVerified ? PLATFORM_COLORS[platform] : 'var(--text-muted)' }}
              />
              {isVerified && (
                <div style={{
                  position: 'absolute', bottom: '-4px', right: '-4px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={7} style={{ color: '#0A0B0F' }} strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom status */}
      <div style={{ textAlign: 'center' }}>
        {allVerified ? (
          <span style={{ fontSize: '12px', color: 'var(--success)' }}> Cryptographically verified</span>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {verifiedCount} of 3 identities verified
          </span>
        )}
      </div>
    </div>
  );
}


