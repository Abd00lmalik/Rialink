import type { ProofRecord } from "./types";

export const MOCK_WALLET = "7xKmW3RqPbN9eDfTvL2sY6hJcA4mX8uZ1nQrV5wE3pk";

function mockBindingProof(id: string, nonce: string): ProofRecord["bindingProof"] {
  return {
    method: "oauth+wallet-signature",
    algorithm: "HS256",
    verifier: "rialink-api",
    issuedAt: "2026-03-26T10:00:00Z",
    socialSessionId: id,
    walletNonce: nonce,
    walletSignature: "mock-signature",
    walletMessage: "Rialink Wallet Ownership Proof",
    token: `mock-token-${id}`,
  };
}

export const MOCK_PROOFS: ProofRecord[] = [
  {
    platform: "github",
    wallet: MOCK_WALLET,
    userId: "9919",
    username: "abd00lmalik",
    verified: true,
    verifiedAt: "2026-03-26T10:12:00Z",
    proofMethod: "oauth+wallet-signature",
    proofHash:
      "89d0a4b55e7f31c248d1f9708f6a2c9b89d0a4b55e7f31c248d1f9708f6a2c9b",
    bindingProof: mockBindingProof("github-mock-session", "nonce-gh"),
    txSignature: "offchain:5j3Kqk1W8aYJ9u7q4RrK6p1n2M5d8t6Q",
    repoCount: 10,
    commitCount: 146,
    pfpUrl: "https://avatars.githubusercontent.com/u/9919?v=4",
  },
  {
    platform: "discord",
    wallet: MOCK_WALLET,
    userId: "338011551234567890",
    username: "abd00lmalik11",
    verified: true,
    verifiedAt: "2026-03-26T10:14:00Z",
    proofMethod: "oauth+wallet-signature",
    proofHash:
      "4011e77d945da1b8849f63c7720b6a514011e77d945da1b8849f63c7720b6a51",
    bindingProof: mockBindingProof("discord-mock-session", "nonce-dc"),
    txSignature: "offchain:2vT8dQ7mL4nS1kB9pA5xC3jR6wE8yU2h",
    accountCreatedAt: "2023-07-10T00:00:00Z",
    serverCount: 32,
    pfpUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
  },
  {
    platform: "farcaster",
    wallet: MOCK_WALLET,
    userId: "10381",
    username: "abd1",
    verified: true,
    verifiedAt: "2026-03-26T10:16:00Z",
    proofMethod: "farcaster-signin+wallet-signature",
    proofHash:
      "4f60710b734bc8e5f3a2d1c0b9a887664f60710b734bc8e5f3a2d1c0b9a88766",
    bindingProof: {
      ...mockBindingProof("farcaster-mock-session", "nonce-fc"),
      method: "farcaster-signin+wallet-signature",
    },
    txSignature: "offchain:9mV4pK2qF7xD1nB8sL3cT5rJ6yW0uH4e",
    followerCount: 10,
    pfpUrl: "https://i.pravatar.cc/120?img=15",
  },
];

