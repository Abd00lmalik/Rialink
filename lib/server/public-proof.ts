import type { ProofRecord } from "@/lib/types";

export interface PublicProof {
  platform: ProofRecord["platform"];
  user_id: string;
  userId: string;
  username: string;
  full_name?: string;
  fullName?: string;
  verified: boolean;
  verified_at: string;
  verifiedAt: string;
  proof_hash?: string;
  proofHash?: string;
  pfpUrl?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
  accountCreatedAt?: string;
  proof_method?: string;
  proofMethod?: string;
  binding_proof?: {
    method: string;
    algorithm: string;
    verifier: string;
    issuedAt: string;
  };
}

interface SerializeOptions {
  includeProofHash?: boolean;
}

export function toPublicProof(
  proof: ProofRecord,
  options: SerializeOptions = {}
): PublicProof {
  return {
    platform: proof.platform,
    user_id: proof.userId,
    userId: proof.userId,
    username: proof.username,
    ...(proof.fullName ? { full_name: proof.fullName, fullName: proof.fullName } : {}),
    verified: proof.verified,
    verified_at: proof.verifiedAt,
    verifiedAt: proof.verifiedAt,
    ...(options.includeProofHash
      ? { proof_hash: proof.proofHash, proofHash: proof.proofHash }
      : {}),
    ...(proof.pfpUrl ? { pfpUrl: proof.pfpUrl } : {}),
    ...(proof.repoCount !== undefined ? { repoCount: proof.repoCount } : {}),
    ...(proof.commitCount !== undefined ? { commitCount: proof.commitCount } : {}),
    ...(proof.followerCount !== undefined
      ? { followerCount: proof.followerCount }
      : {}),
    ...(proof.serverCount !== undefined ? { serverCount: proof.serverCount } : {}),
    ...(proof.accountCreatedAt ? { accountCreatedAt: proof.accountCreatedAt } : {}),
    ...(proof.proofMethod
      ? { proof_method: proof.proofMethod, proofMethod: proof.proofMethod }
      : {}),
    binding_proof: {
      method: proof.bindingProof.method,
      algorithm: proof.bindingProof.algorithm,
      verifier: proof.bindingProof.verifier,
      issuedAt: proof.bindingProof.issuedAt,
    },
  };
}
