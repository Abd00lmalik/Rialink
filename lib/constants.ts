import type { Platform } from './types';

export interface PlatformConfig {
  name: string;
  color: string;
  colorVar: string;
  bgMuted: string;
  description: string;
  scope: string;
  tag: string;
  authNote: string;
}

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  github: {
    name: 'GitHub',
    color: '#7C3AED',
    colorVar: 'var(--github)',
    bgMuted: 'rgba(124, 58, 237, 0.1)',
    description:
      'Verify your developer identity. We confirm your username and public repository count.',
    scope: 'read:user',
    tag: 'Developer',
    authNote: 'OAuth 2.0  read-only access  no passwords stored',
  },
  discord: {
    name: 'Discord',
    color: '#5865F2',
    colorVar: 'var(--discord)',
    bgMuted: 'rgba(88, 101, 242, 0.1)',
    description:
      'Verify your community identity. Confirm your username and account legitimacy.',
    scope: 'identify',
    tag: 'Community',
    authNote: 'OAuth 2.0  read-only access  no passwords stored',
  },
  farcaster: {
    name: 'Farcaster',
    color: '#855DCD',
    colorVar: 'var(--farcaster)',
    bgMuted: 'rgba(133, 93, 205, 0.1)',
    description:
      'Native Web3 identity. Sign in with your wallet via Farcaster. No OAuth keys needed.',
    scope: 'wallet-based',
    tag: 'Web3',
    authNote: 'Sign In With Farcaster  wallet-based',
  },
};

export const CONTRACT_ADDRESS = 'PLACEHOLDER_RIALO_CONTRACT';
export const EXPLORER_URL = 'https://explorer.rialo.io';
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

