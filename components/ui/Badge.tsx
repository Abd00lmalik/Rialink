'use client';

interface BadgeProps {
  variant: 'verified' | 'unverified' | 'pending' | 'error';
  className?: string;
}

const BADGE_STYLES: Record<BadgeProps['variant'], { bg: string; border: string; color: string; text: string }> = {
  verified: {
    bg: 'var(--success-muted)',
    border: 'rgba(52,211,153,0.2)',
    color: 'var(--success)',
    text: ' Verified',
  },
  unverified: {
    bg: 'var(--bg-elevated)',
    border: 'var(--border-default)',
    color: 'var(--text-muted)',
    text: ' Not verified',
  },
  pending: {
    bg: 'var(--warning-muted)',
    border: 'rgba(251,191,36,0.2)',
    color: 'var(--warning)',
    text: ' Pending',
  },
  error: {
    bg: 'var(--error-muted)',
    border: 'rgba(248,113,113,0.2)',
    color: 'var(--error)',
    text: ' Failed',
  },
};

export function Badge({ variant, className = '' }: BadgeProps) {
  const s = BADGE_STYLES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        borderRadius: '6px',
        padding: '3px 8px',
        fontSize: '12px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {variant === 'verified' ? (
        <>
          <span className="pulse-dot"></span>
          <span>Verified</span>
        </>
      ) : (
        s.text
      )}
    </span>
  );
}

