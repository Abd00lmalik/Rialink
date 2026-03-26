import type { ProofRecord } from "./types";

export const MOCK_WALLET = "7xKmW3RqPbN9eDfTvL2sY6hJcA4mX8uZ1nQrV5wE3pk";

export const MOCK_PROOFS: ProofRecord[] = [
  {
    platform: "github",
    maskedUsername: "ab****ik",
    repoCount: 10,
    commitCount: 146,
    verifiedAt: "2026-03-26T10:12:00Z",
    proofHash: "89d0a4b55e7f31c248d1f9708f6a2c9b89d0a4b55e7f31c248d1f9708f6a2c9b",
    wallet: MOCK_WALLET,
    usernameHash: "c8f2e4b1a3d9f2e07a3d9f2ec8f2e4b1c8f2e4b1a3d9f2e07a3d9f2ec8f2e4b1",
    txSignature: "5j3Kqk1W8aYJ9u7q4RrK6p1n2M5d8t6Q",
    pfpUrl: "https://avatars.githubusercontent.com/u/9919?v=4",
  },
  {
    platform: "discord",
    maskedUsername: "ab****11",
    accountCreatedAt: "2023-07-10T00:00:00Z",
    serverCount: 32,
    verifiedAt: "2026-03-26T10:14:00Z",
    proofHash: "4011e77d945da1b8849f63c7720b6a514011e77d945da1b8849f63c7720b6a51",
    wallet: MOCK_WALLET,
    usernameHash: "d9e3f2a48b1c7e5dd9e3f2a48b1c7e5dd9e3f2a48b1c7e5dd9e3f2a48b1c7e5d",
    txSignature: "2vT8dQ7mL4nS1kB9pA5xC3jR6wE8yU2h",
    pfpUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
  },
  {
    platform: "farcaster",
    maskedUsername: "a****1",
    followerCount: 10,
    verifiedAt: "2026-03-26T10:16:00Z",
    proofHash: "4f60710b734bc8e5f3a2d1c0b9a887664f60710b734bc8e5f3a2d1c0b9a88766",
    wallet: MOCK_WALLET,
    usernameHash: "f2a4c8e19b7d3f6af2a4c8e19b7d3f6af2a4c8e19b7d3f6af2a4c8e19b7d3f6a",
    txSignature: "9mV4pK2qF7xD1nB8sL3cT5rJ6yW0uH4e",
    pfpUrl: "https://i.pravatar.cc/120?img=15",
  },
];
