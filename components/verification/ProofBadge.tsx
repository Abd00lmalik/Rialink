'use client';

import { AddressDisplay } from '@/components/ui/AddressDisplay';
import type { VerificationState } from '@/lib/types';

/* ─── SVG platform icons (same as VerificationCard) ─── */
function GitHubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function FarcasterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.996 0C5.372 0 0 5.372 0 11.996c0 6.625 5.372 12 11.996 12C18.625 24 24 18.625 24 11.996 24 5.372 18.625 0 11.996 0zm5.24 17.08h-2.2v-4.702c0-.972-.385-1.46-1.154-1.46-.848 0-1.271.512-1.271 1.46v2.516h-2.19v-2.516c0-.948-.424-1.46-1.271-1.46-.77 0-1.155.488-1.155 1.46V17.08h-2.2V9.723h2.2v.95c.476-.73 1.19-1.097 2.14-1.097.963 0 1.72.4 2.27 1.2.564-.8 1.38-1.2 2.44-1.2 1.8 0 2.39 1.25 2.39 3.13V17.08zM7.42 8.33c-.73 0-1.32-.59-1.32-1.32 0-.73.59-1.32 1.32-1.32.73 0 1.32.59 1.32 1.32 0 .73-.59 1.32-1.32 1.32zm9.15 0c-.73 0-1.32-.59-1.32-1.32 0-.73.59-1.32 1.32-1.32.73 0 1.32.59 1.32 1.32 0 .73-.59 1.32-1.32 1.32z" />
    </svg>
  );
}

const PLATFORM_ICONS = { github: GitHubIcon, discord: DiscordIcon, farcaster: FarcasterIcon };
const PLATFORM_KEYS = ['github', 'discord', 'farcaster'] as const;

interface ProofBadgeProps {
  wallet: string;
  verifications: VerificationState[];
}

export function ProofBadge({ wallet, verifications }: ProofBadgeProps) {
  const verifiedCount = verifications.filter((v) => v.status === 'verified').length;

  return (
    <div className="verify-badge-card">
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Rialink</span>
        <span className="verify-badge-network-chip">on Rialo</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 10 }} />

      {/* Address */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <AddressDisplay address={wallet} />
      </div>

      {/* Platform icons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 12 }}>
        {PLATFORM_KEYS.map((platform) => {
          const Icon = PLATFORM_ICONS[platform];
          const isVerified = verifications.find((v) => v.platform === platform)?.status === 'verified';
          return (
            <div key={platform} style={{ position: 'relative', display: 'inline-flex', color: isVerified ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.28s ease' }}>
              <Icon size={20} />
              {isVerified && (
                <div className="verify-badge-check">
                  <svg width={7} height={7} viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#05231F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom status */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: verifiedCount === 3 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {verifiedCount} of 3 identities verified
        </span>
      </div>
    </div>
  );
}
