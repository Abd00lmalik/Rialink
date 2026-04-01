import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import type { Platform, ProofRecord } from "@/lib/types";
import { cardIdFromWallet } from "@/lib/card-id";
import { computeProofHash } from "@/lib/proof-hash";
import { signProof } from "@/lib/server/proof-signing";

const redis = Redis.fromEnv();
const PROOF_PREFIX = "proofs:";
const ROOT_PREFIX = "root:";
const CARD_PREFIX = "card:";
const PLATFORM_USER_PREFIX = "platform-user:";
const PROOF_NONCE_PREFIX = "proof-nonce:";
const PROOF_WALLET_LOCK_PREFIX = "proofs:lock:";
const PLATFORM_USER_LOCK_PREFIX = "platform-user:lock:";
const PROOF_NONCE_LOCK_PREFIX = "proof-nonce:lock:";
const PROOF_WALLETS_INDEX_KEY = "proofs:wallet-index";
const STATS_WALLETS_KEY = "stats:wallets";
const STATS_PROOFS_KEY = "stats:proofs";

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

function proofNonceKey(nonce: string) {
  return `${PROOF_NONCE_PREFIX}${nonce}`;
}

function walletLockKey(wallet: string) {
  return `${PROOF_WALLET_LOCK_PREFIX}${wallet}`;
}

function platformUserLockKey(platform: Platform, userId: string) {
  return `${PLATFORM_USER_LOCK_PREFIX}${platform}:${userId}`;
}

function proofNonceLockKey(nonce: string) {
  return `${PROOF_NONCE_LOCK_PREFIX}${nonce}`;
}

function proofNonceOwner(wallet: string, platform: Platform, userId: string) {
  return `${wallet}:${platform}:${userId}`;
}

async function updateStats(args: {
  wallet: string;
  previousCount: number;
  nextCount: number;
}) {
  const proofDelta = args.nextCount - args.previousCount;
  if (proofDelta !== 0) {
    await redis.incrby(STATS_PROOFS_KEY, proofDelta);
  }

  if (args.previousCount === 0 && args.nextCount > 0) {
    await redis.sadd(PROOF_WALLETS_INDEX_KEY, args.wallet);
    await redis.incrby(STATS_WALLETS_KEY, 1);
  } else if (args.previousCount > 0 && args.nextCount === 0) {
    await redis.srem(PROOF_WALLETS_INDEX_KEY, args.wallet);
    await redis.incrby(STATS_WALLETS_KEY, -1);
  }
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
  const fullName = String(row.fullName || row.full_name || "").trim();
  const userId = String(row.userId || row.usernameHash || "").trim();
  const resolvedUserId = userId || `${platform}:legacy:${createHash("sha256").update(username || wallet).digest("hex").slice(0, 16)}`;
  const version = row.version === "v2" ? "v2" : "v1";
  const nonce = String(row.nonce || "").trim() || "legacy";
  const issuedAtRaw = Number(row.issuedAt);
  const issuedAt = Number.isFinite(issuedAtRaw) && issuedAtRaw > 0 ? issuedAtRaw : 0;
  const proofHash =
    String(row.proofHash || "").trim() ||
    computeProofHash({
      wallet,
      platform,
      platformUserId: resolvedUserId,
      nonce,
      version,
    });
  const signature = String(row.signature || "").trim() || signProof(proofHash);

  const bindingProof =
    row.bindingProof && typeof row.bindingProof === "object"
      ? (row.bindingProof as ProofRecord["bindingProof"])
      : fallbackBindingProof(verifiedAt);

  return {
    wallet,
    platform,
    userId: resolvedUserId,
    username: username || `unknown-${resolvedUserId.slice(0, 6)}`,
    ...(fullName ? { fullName } : {}),
    verified: row.verified === false ? false : true,
    verifiedAt,
    nonce,
    issuedAt,
    signature,
    version,
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
  const proofs = await readWalletProofs(wallet);
  if (proofs.length > 0) {
    await redis.sadd(PROOF_WALLETS_INDEX_KEY, wallet);
    await redis.set(cardKey(cardIdFromWallet(wallet)), wallet);
  }
  return proofs;
}

export async function getIdentityRoot(wallet: string): Promise<string | null> {
  const root = await redis.get<string>(rootKey(wallet));
  return root || null;
}

export async function saveProof(wallet: string, proof: ProofRecord) {
  const existing = await readWalletProofs(wallet);
  const existingByPlatform = existing.find((p) => p.platform === proof.platform);
  const locks = [walletLockKey(wallet), platformUserLockKey(proof.platform, proof.userId)];
  if (proof.nonce && proof.nonce !== "legacy") {
    locks.push(proofNonceLockKey(proof.nonce));
  }
  if (
    existingByPlatform &&
    existingByPlatform.userId &&
    existingByPlatform.userId !== proof.userId
  ) {
    locks.push(platformUserLockKey(existingByPlatform.platform, existingByPlatform.userId));
  }
  if (
    existingByPlatform &&
    existingByPlatform.nonce &&
    existingByPlatform.nonce !== "legacy" &&
    existingByPlatform.nonce !== proof.nonce
  ) {
    locks.push(proofNonceLockKey(existingByPlatform.nonce));
  }

  return withLocks(locks, async () => {
    const freshExisting = await readWalletProofs(wallet);
    const freshByPlatform = freshExisting.find((p) => p.platform === proof.platform);
    if (freshByPlatform?.userId && freshByPlatform.userId !== existingByPlatform?.userId) {
      throw new ProofConflictError("Proof changed during update. Please retry.");
    }
    if (
      freshByPlatform?.nonce &&
      freshByPlatform.nonce !== "legacy" &&
      freshByPlatform.nonce !== existingByPlatform?.nonce
    ) {
      throw new ProofConflictError("Proof changed during update. Please retry.");
    }
    const nextNonceOwner = proofNonceOwner(wallet, proof.platform, proof.userId);

    const accountOwner = await redis.get<string>(
      platformUserKey(proof.platform, proof.userId)
    );
    if (accountOwner && accountOwner !== wallet) {
      throw new ProofConflictError(
        `${proof.platform} account ${proof.username} is already linked to another wallet`
      );
    }
    if (proof.nonce && proof.nonce !== "legacy") {
      const nonceOwner = await redis.get<string>(proofNonceKey(proof.nonce));
      if (nonceOwner && nonceOwner !== nextNonceOwner) {
        throw new ProofConflictError("Proof nonce has already been used");
      }
    }

    const filtered = freshExisting.filter((p) => p.platform !== proof.platform);
    const nextProofs = [...filtered, proof];
    const previousCount = freshExisting.length;
    const nextCount = nextProofs.length;
    await writeWalletProofs(wallet, nextProofs);

    // Keep reverse index in sync so one social account cannot be linked to multiple wallets.
    await redis.set(platformUserKey(proof.platform, proof.userId), wallet);
    if (proof.nonce && proof.nonce !== "legacy") {
      await redis.set(proofNonceKey(proof.nonce), nextNonceOwner);
    }
    if (freshByPlatform && freshByPlatform.userId && freshByPlatform.userId !== proof.userId) {
      const oldKey = platformUserKey(freshByPlatform.platform, freshByPlatform.userId);
      const oldMappedWallet = await redis.get<string>(oldKey);
      if (oldMappedWallet === wallet) {
        await redis.del(oldKey);
      }
    }
    if (
      freshByPlatform &&
      freshByPlatform.nonce &&
      freshByPlatform.nonce !== "legacy" &&
      freshByPlatform.nonce !== proof.nonce
    ) {
      const oldNonceKey = proofNonceKey(freshByPlatform.nonce);
      const oldNonceOwner = await redis.get<string>(oldNonceKey);
      const previousOwner = proofNonceOwner(
        wallet,
        freshByPlatform.platform,
        freshByPlatform.userId
      );
      if (oldNonceOwner === previousOwner) {
        await redis.del(oldNonceKey);
      }
    }

    const identityRoot = computeIdentityRoot(nextProofs);
    const cardId = cardIdFromWallet(wallet);
    await redis.set(cardKey(cardId), wallet);
    await redis.sadd(PROOF_WALLETS_INDEX_KEY, wallet);
    await updateStats({ wallet, previousCount, nextCount });

    if (identityRoot) {
      await redis.set(rootKey(wallet), identityRoot);
    } else {
      await redis.del(rootKey(wallet));
    }

    return { proof, proofs: nextProofs, cardId, identityRoot };
  });
}

export async function deleteProof(wallet: string, platform: Platform) {
  const existing = await readWalletProofs(wallet);
  const target = existing.find((p) => p.platform === platform);
  const locks = [walletLockKey(wallet)];
  if (target?.userId) {
    locks.push(platformUserLockKey(target.platform, target.userId));
  }
  if (target?.nonce && target.nonce !== "legacy") {
    locks.push(proofNonceLockKey(target.nonce));
  }

  return withLocks(locks, async () => {
    const existing = await readWalletProofs(wallet);
    const removed = existing.find((p) => p.platform === platform);
    if (removed?.userId && removed.userId !== target?.userId) {
      // If platform ownership changed between pre-read and lock acquisition,
      // force a retry so we always hold the correct platform-user lock.
      throw new ProofConflictError("Proof changed during update. Please retry.");
    }
    if (
      removed?.nonce &&
      removed.nonce !== "legacy" &&
      removed.nonce !== target?.nonce
    ) {
      throw new ProofConflictError("Proof changed during update. Please retry.");
    }

    const filtered = existing.filter((p) => p.platform !== platform);
    const previousCount = existing.length;
    const nextCount = filtered.length;

    await writeWalletProofs(wallet, filtered);

    if (removed?.userId) {
      const reverseKey = platformUserKey(removed.platform, removed.userId);
      const mappedWallet = await redis.get<string>(reverseKey);
      if (mappedWallet === wallet) {
        await redis.del(reverseKey);
      }
    }
    if (removed?.nonce && removed.nonce !== "legacy") {
      const nonceKey = proofNonceKey(removed.nonce);
      const mappedOwner = await redis.get<string>(nonceKey);
      const expectedOwner = proofNonceOwner(wallet, removed.platform, removed.userId);
      if (mappedOwner === expectedOwner) {
        await redis.del(nonceKey);
      }
    }

    const identityRoot = computeIdentityRoot(filtered);
    const cardId = cardIdFromWallet(wallet);
    await updateStats({ wallet, previousCount, nextCount });

    if (identityRoot) {
      await redis.set(rootKey(wallet), identityRoot);
      await redis.set(cardKey(cardId), wallet);
      await redis.sadd(PROOF_WALLETS_INDEX_KEY, wallet);
    } else {
      await redis.del(rootKey(wallet));
      await redis.del(cardKey(cardId));
      await redis.srem(PROOF_WALLETS_INDEX_KEY, wallet);
    }

    return { cardId, identityRoot };
  });
}

export async function resolveWalletFromCardId(cardId: string): Promise<string | null> {
  const cached = await redis.get<string>(cardKey(cardId));
  if (cached) return cached;

  // Backfill lookup from indexed wallets without Redis KEYS scans.
  const wallets = (await redis.smembers<string[]>(PROOF_WALLETS_INDEX_KEY)) || [];
  for (const wallet of wallets) {
    if (cardIdFromWallet(wallet) === cardId) {
      await redis.set(cardKey(cardId), wallet);
      return wallet;
    }
  }

  return null;
}

export async function getNetworkStats(): Promise<{
  wallets: number;
  proofs: number;
  platforms: number;
}> {
  const [walletsRaw, proofsRaw] = await Promise.all([
    redis.get<number | string>(STATS_WALLETS_KEY),
    redis.get<number | string>(STATS_PROOFS_KEY),
  ]);

  const wallets = Number(walletsRaw || 0);
  const proofs = Number(proofsRaw || 0);
  const countersReady =
    walletsRaw !== null &&
    walletsRaw !== undefined &&
    proofsRaw !== null &&
    proofsRaw !== undefined;

  if (!countersReady) {
    const walletsFromIndex = (await redis.smembers<string[]>(PROOF_WALLETS_INDEX_KEY)) || [];
    let proofCount = 0;
    for (const wallet of walletsFromIndex) {
      const rows = await readWalletProofs(wallet);
      proofCount += rows.length;
    }
    await redis.set(STATS_WALLETS_KEY, walletsFromIndex.length);
    await redis.set(STATS_PROOFS_KEY, proofCount);
    return {
      wallets: walletsFromIndex.length,
      proofs: proofCount,
      platforms: 3,
    };
  }

  return {
    wallets: Number.isFinite(wallets) && wallets > 0 ? wallets : 0,
    proofs: Number.isFinite(proofs) && proofs > 0 ? proofs : 0,
    platforms: 3,
  };
}

