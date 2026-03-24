export type Platform = 'github' | 'discord' | 'farcaster';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'error'
  | 'revoking';

export interface ProofRecord {
  wallet: string;
  platform: Platform;
  proofHash: string;
  usernameHash: string;
  maskedUsername: string;
  verifiedAt: string;
  txSignature?: string;
  repoCount?: number;
  followerCount?: number;
  pfpUrl?: string;
}

export interface VerificationState {
  platform: Platform;
  status: VerificationStatus;
  proof?: ProofRecord;
  error?: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
}

