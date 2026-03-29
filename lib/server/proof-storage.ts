import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import type { Platform, ProofRecord } from "@/lib/types";
import { cardIdFromWallet } from "@/lib/card-id";
import { computeProofHash } from "@/lib/proof-hash";

const redis = Redis.fromEnv();
const PROOF_PREFIX = "proofs:";
const ROOT_PREFIX = "root:";
const CARD_PREFIX = "card:";
const PLATFORM_USER_PREFIX = "platform-user:";
const PROOF_WALLET_LOCK_PREFIX = "proofs:lock:";
const PLATFORM_USER_LOCK_PREFIX = "platform-user:lock:";

const MUTATION_LOCK_TTL_SECONDS = 30;

const VALID_PLATFORMS = new Set<Platform>(["github", "discord", "farcaster"]);

export class ProofConflictError extends Error {
  code = "PROOF_CONFLICT";
  constructor(message: string) {
    super(message);
  }
}

function proofListKey(wallet: string) {
  return `${PROOF_PREFIX}${wallet}`;
}

function rootKey(wallet: string) {
  return `${ROOT_PREFIX}${wallet}`;
}

function cardKey(cardId: string) {
  return `${CARD_PREFIX}${cardId}`;
}

function platformUserKey(platform: Platform, userId: string) {
  return `${PLATFORM_USER_PREFIX}${platform}:${userId}`;
}

function walletLockKey(wallet: string) {
  return `${PROOF_WALLET_LOCK_PREFIX}${wallet}`;
}

function platformUserLockKey(platform: Platform, userId: string) {
  return `${PLATFORM_USER_LOCK_PREFIX}${platform}:${userId}`;
}

function fallbackBindingProof(verifiedAt: string): ProofRecord["bindingProof"] {
  return {
    method: "legacy-bridge",
    algorithm: "HS256",
    verifier: "legacy-import",
    issuedAt: verifiedAt,
    socialSessionId: "legacy",
    walletNonce: "",
    walletSignature: "",
    walletMessage: "",
    token: "",
  };
}

function normalizeProofRecord(value: unknown, walletFromKey?: string): ProofRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  const platform = String(row.platform || "").trim() as Platform;
  if (!VALID_PLATFORMS.has(platform)) return null;

  const wallet = String(row.wallet || walletFromKey || "").trim();
  if (!wallet) return null;

  const verifiedAt = String(row.verifiedAt || new Date().toISOString());
  const username = String(row.username || row.maskedUsername || "").trim();
  const userId = String(row.userId || row.usernameHash || "").trim();
  const resolvedUserId = userId || `${platform}:legacy:${createHash("sha256").update(username || wallet).digest("hex").slice(0, 16)}`;
  const proofHash =
    String(row.proofHash || "").trim() ||
    computeProofHash({
      wallet,
      platform,
      platformUserId: resolvedUserId,
    });

  const bindingProof =
    row.bindingProof && typeof row.bindingProof === "object"
      ? (row.bindingProof as ProofRecord["bindingProof"])
      : fallbackBindingProof(verifiedAt);

  return {
    wallet,
    platform,
    userId: resolvedUserId,
    username: username || `unknown-${resolvedUserId.slice(0, 6)}`,
    verified: row.verified === false ? false : true,
    verifiedAt,
    proofMethod: String(row.proofMethod || bindingProof.method || "legacy-bridge"),
    proofHash,
    bindingProof: {
      ...fallbackBindingProof(verifiedAt),
      ...bindingProof,
    },
    ...(row.txSignature ? { txSignature: String(row.txSignature) } : {}),
    ...(row.repoCount !== undefined ? { repoCount: Number(row.repoCount) || 0 } : {}),
    ...(row.commitCount !== undefined ? { commitCount: Number(row.commitCount) || 0 } : {}),
    ...(row.followerCount !== undefined ? { followerCount: Number(row.followerCount) || 0 } : {}),
    ...(row.serverCount !== undefined ? { serverCount: Number(row.serverCount) || 0 } : {}),
    ...(row.pfpUrl ? { pfpUrl: String(row.pfpUrl) } : {}),
    ...(row.accountCreatedAt ? { accountCreatedAt: String(row.accountCreatedAt) } : {}),
    ...(row.usernameHash ? { usernameHash: String(row.usernameHash) } : {}),
    ...(row.maskedUsername ? { maskedUsername: String(row.maskedUsername) } : {}),
  };
}

function computeIdentityRoot(proofs: ProofRecord[]): string | null {
  const hashes = proofs.map((p) => p.proofHash).filter(Boolean).sort();
  if (hashes.length === 0) return null;
  return createHash("sha256")
    .update(`rialink:root:v1|${hashes.join("|")}`)
    .digest("hex");
}

async function readWalletProofs(wallet: string): Promise<ProofRecord[]> {
  const raw = (await redis.lrange<unknown>(proofListKey(wallet), 0, -1)) || [];
  return raw
    .map((row) => normalizeProofRecord(row, wallet))
    .filter((row): row is ProofRecord => !!row);
}

async function writeWalletProofs(wallet: string, proofs: ProofRecord[]) {
  const key = proofListKey(wallet);
  await redis.del(key);
  if (proofs.length > 0) {
    await redis.rpush(key, ...proofs);
  }
}

async function acquireLocks(lockKeys: string[]): Promise<string[]> {
  const acquired: string[] = [];
  for (const lockKey of lockKeys) {
    const lockAcquired = await redis.set(lockKey, "1", {
      nx: true,
      ex: MUTATION_LOCK_TTL_SECONDS,
    });
    if (!lockAcquired) {
      if (acquired.length > 0) {
        await Promise.all(acquired.map((key) => redis.del(key)));
      }
      return [];
    }
    acquired.push(lockKey);
  }
  return acquired;
}

async function withLocks<T>(lockKeys: string[], fn: () => Promise<T>): Promise<T> {
  const keys = Array.from(new Set(lockKeys.filter(Boolean))).sort();
  const acquired = await acquireLocks(keys);
  if (acquired.length !== keys.length) {
    throw new ProofConflictError("Another proof update is already in progress. Please retry.");
  }

  try {
    return await fn();
  } finally {
    await Promise.all(acquired.map((key) => redis.del(key)));
  }
}

export async function getProofs(wallet: string): Promise<ProofRecord[]> {
  return readWalletProofs(wallet);
}

export async function getIdentityRoot(wallet: string): Promise<string | null> {
  const root = await redis.get<string>(rootKey(wallet));
  return root || null;
}

export async function saveProof(wallet: string, proof: ProofRecord) {
  const existing = await readWalletProofs(wallet);
  const existingByPlatform = existing.find((p) => p.platform === proof.platform);
  const locks = [walletLockKey(wallet), platformUserLockKey(proof.platform, proof.userId)];
  if (
    existingByPlatform &&
    existingByPlatform.userId &&
    existingByPlatform.userId !== proof.userId
  ) {
    locks.push(platformUserLockKey(existingByPlatform.platform, existingByPlatform.userId));
  }

  return withLocks(locks, async () => {
    const freshExisting = await readWalletProofs(wallet);
    const freshByPlatform = freshExisting.find((p) => p.platform === proof.platform);

    const accountOwner = await redis.get<string>(
      platformUserKey(proof.platform, proof.userId)
    );
    if (accountOwner && accountOwner !== wallet) {
      throw new ProofConflictError(
        `${proof.platform} account ${proof.username} is already linked to another wallet`
      );
    }

    const filtered = freshExisting.filter((p) => p.platform !== proof.platform);
    const nextProofs = [...filtered, proof];
    await writeWalletProofs(wallet, nextProofs);

    // Keep reverse index in sync so one social account cannot be linked to multiple wallets.
    await redis.set(platformUserKey(proof.platform, proof.userId), wallet);
    if (freshByPlatform && freshByPlatform.userId && freshByPlatform.userId !== proof.userId) {
      const oldKey = platformUserKey(freshByPlatform.platform, freshByPlatform.userId);
      const oldMappedWallet = await redis.get<string>(oldKey);
      if (oldMappedWallet === wallet) {
        await redis.del(oldKey);
      }
    }

    const identityRoot = computeIdentityRoot(nextProofs);
    const cardId = cardIdFromWallet(wallet);
    await redis.set(cardKey(cardId), wallet);

    if (identityRoot) {
      await redis.set(rootKey(wallet), identityRoot);
    } else {
      await redis.del(rootKey(wallet));
    }

    return { proof, proofs: nextProofs, cardId, identityRoot };
  });
}

export async function deleteProof(wallet: string, platform: Platform) {
  return withLocks([walletLockKey(wallet)], async () => {
    const existing = await readWalletProofs(wallet);
    const removed = existing.find((p) => p.platform === platform);
    const filtered = existing.filter((p) => p.platform !== platform);

    await writeWalletProofs(wallet, filtered);

    if (removed?.userId) {
      const reverseKey = platformUserKey(removed.platform, removed.userId);
      const mappedWallet = await redis.get<string>(reverseKey);
      if (mappedWallet === wallet) {
        await redis.del(reverseKey);
      }
    }

    const identityRoot = computeIdentityRoot(filtered);
    const cardId = cardIdFromWallet(wallet);

    if (identityRoot) {
      await redis.set(rootKey(wallet), identityRoot);
      await redis.set(cardKey(cardId), wallet);
    } else {
      await redis.del(rootKey(wallet));
      await redis.del(cardKey(cardId));
    }

    return { cardId, identityRoot };
  });
}

export async function resolveWalletFromCardId(cardId: string): Promise<string | null> {
  const cached = await redis.get<string>(cardKey(cardId));
  if (cached) return cached;

  // Backfill lookup for older rows.
  const keys = (await redis.keys(`${PROOF_PREFIX}*`)) as string[];
  for (const key of keys || []) {
    const wallet = String(key).replace(PROOF_PREFIX, "");
    if (cardIdFromWallet(wallet) === cardId) {
      await redis.set(cardKey(cardId), wallet);
      return wallet;
    }
  }

  return null;
}

