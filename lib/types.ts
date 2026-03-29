export type Platform = "github" | "discord" | "farcaster";

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "error"
  | "revoking";

export interface BindingProofRecord {
  method: string;
  algorithm: "HS256";
  verifier: string;
  issuedAt: string;
  socialSessionId: string;
  walletNonce: string;
  walletSignature: string;
  walletMessage: string;
  token: string;
}

export interface ProofRecord {
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  fullName?: string;
  verified: boolean;
  verifiedAt: string;
  proofMethod: string;
  proofHash: string;
  bindingProof: BindingProofRecord;
  txSignature?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
  pfpUrl?: string;
  accountCreatedAt?: string;
  // Legacy fields kept optional for backward compatibility with old data rows.
  usernameHash?: string;
  maskedUsername?: string;
}

export interface VerificationState {
  platform: Platform;
  status: VerificationStatus;
  proof?: ProofRecord;
  error?: string;
}

export interface ToastItem {
  id: string;
  type: "success" | "error" | "warning";
  title: string;
  message?: string;
}
