import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";
import type { Platform } from "@/lib/types";

const redis = Redis.fromEnv();

const OAUTH_REQUEST_PREFIX = "oauth:request:";
const VERIFIED_SOCIAL_PREFIX = "verify:session:";
const VERIFIED_SOCIAL_META_PREFIX = "verify:session:meta:";
const VERIFIED_SOCIAL_USED_PREFIX = "verify:session:used:";
const VERIFIED_SOCIAL_LOCK_PREFIX = "verify:session:lock:";

const OAUTH_REQUEST_TTL_SECONDS = 10 * 60;
const VERIFIED_SOCIAL_TTL_SECONDS = 10 * 60;
const VERIFIED_SOCIAL_META_TTL_SECONDS = 24 * 60 * 60;
const VERIFIED_SOCIAL_USED_TTL_SECONDS = 24 * 60 * 60;
const VERIFIED_SOCIAL_LOCK_TTL_SECONDS = 30;

export interface OAuthRequestSession {
  id: string;
  wallet: string;
  platform: Exclude<Platform, "farcaster">;
  issuedAt: string;
  expiresAt: string;
}

export interface VerifiedSocialSession {
  id: string;
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  proofMethod: string;
  providerSessionId: string;
  issuedAt: string;
  expiresAt: string;
  pfpUrl?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
  accountCreatedAt?: string;
}

interface VerifiedSocialSessionMeta {
  id: string;
  wallet: string;
  platform: Platform;
  issuedAt: string;
  expiresAt: string;
  usedAt?: string;
}

export type VerificationTokenErrorCode =
  | "expired_token"
  | "invalid_token"
  | "wallet_mismatch";

export type ConsumeVerificationResult =
  | { ok: true; session: VerifiedSocialSession }
  | { ok: false; error: VerificationTokenErrorCode };

function randomToken() {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function oauthRequestKey(token: string) {
  return `${OAUTH_REQUEST_PREFIX}${token}`;
}

function verifiedSocialKey(token: string) {
  return `${VERIFIED_SOCIAL_PREFIX}${token}`;
}

function verifiedSocialMetaKey(token: string) {
  return `${VERIFIED_SOCIAL_META_PREFIX}${token}`;
}

function verifiedSocialUsedKey(token: string) {
  return `${VERIFIED_SOCIAL_USED_PREFIX}${token}`;
}

function verifiedSocialLockKey(token: string) {
  return `${VERIFIED_SOCIAL_LOCK_PREFIX}${token}`;
}

function isExpired(isoTimestamp: string) {
  const ts = Date.parse(isoTimestamp);
  return !Number.isFinite(ts) || ts <= Date.now();
}

export async function issueOAuthRequestSession(args: {
  wallet: string;
  platform: Exclude<Platform, "farcaster">;
}) {
  const token = randomToken();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + OAUTH_REQUEST_TTL_SECONDS * 1000).toISOString();
  const payload: OAuthRequestSession = {
    id: token,
    wallet: String(args.wallet).trim(),
    platform: args.platform,
    issuedAt,
    expiresAt,
  };

  await redis.set(oauthRequestKey(token), payload, { ex: OAUTH_REQUEST_TTL_SECONDS });
  return payload;
}

export async function consumeOAuthRequestSession(
  token: string,
  expectedPlatform: Exclude<Platform, "farcaster">
): Promise<OAuthRequestSession | null> {
  const key = oauthRequestKey(token);
  const session = await redis.get<OAuthRequestSession>(key);
  if (!session) return null;
  if (session.platform !== expectedPlatform || isExpired(session.expiresAt)) {
    await redis.del(key);
    return null;
  }
  await redis.del(key);
  return session;
}

export async function issueVerifiedSocialSession(args: {
  wallet: string;
  platform: Platform;
  userId: string;
  username: string;
  proofMethod: string;
  providerSessionId: string;
  pfpUrl?: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
  accountCreatedAt?: string;
}) {
  const token = randomToken();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + VERIFIED_SOCIAL_TTL_SECONDS * 1000).toISOString();

  const payload: VerifiedSocialSession = {
    id: token,
    wallet: String(args.wallet).trim(),
    platform: args.platform,
    userId: String(args.userId).trim(),
    username: String(args.username).trim(),
    proofMethod: String(args.proofMethod),
    providerSessionId: String(args.providerSessionId),
    issuedAt,
    expiresAt,
    ...(args.pfpUrl ? { pfpUrl: String(args.pfpUrl) } : {}),
    ...(typeof args.repoCount === "number" ? { repoCount: args.repoCount } : {}),
    ...(typeof args.commitCount === "number" ? { commitCount: args.commitCount } : {}),
    ...(typeof args.followerCount === "number" ? { followerCount: args.followerCount } : {}),
    ...(typeof args.serverCount === "number" ? { serverCount: args.serverCount } : {}),
    ...(args.accountCreatedAt ? { accountCreatedAt: String(args.accountCreatedAt) } : {}),
  };

  const meta: VerifiedSocialSessionMeta = {
    id: token,
    wallet: payload.wallet,
    platform: payload.platform,
    issuedAt,
    expiresAt,
  };

  await redis.set(verifiedSocialKey(token), payload, { ex: VERIFIED_SOCIAL_TTL_SECONDS });
  await redis.set(verifiedSocialMetaKey(token), meta, { ex: VERIFIED_SOCIAL_META_TTL_SECONDS });
  await redis.del(verifiedSocialUsedKey(token));

  return payload;
}

export async function consumeVerifiedSocialSession(args: {
  token: string;
  wallet: string;
  platform: Platform;
}): Promise<ConsumeVerificationResult> {
  const token = String(args.token || "").trim();
  const wallet = String(args.wallet || "").trim();

  if (!token || !wallet) {
    return { ok: false, error: "invalid_token" };
  }

  const usedMarker = await redis.get<string>(verifiedSocialUsedKey(token));
  if (usedMarker) {
    // Token already consumed once. This blocks replay attacks.
    return { ok: false, error: "invalid_token" };
  }

  const activeKey = verifiedSocialKey(token);
  const metaKey = verifiedSocialMetaKey(token);
  const activeSession = await redis.get<VerifiedSocialSession>(activeKey);

  if (!activeSession) {
    const meta = await redis.get<VerifiedSocialSessionMeta>(metaKey);
    if (meta && isExpired(meta.expiresAt)) {
      return { ok: false, error: "expired_token" };
    }
    return { ok: false, error: "invalid_token" };
  }

  if (activeSession.wallet !== wallet) {
    return { ok: false, error: "wallet_mismatch" };
  }
  if (activeSession.platform !== args.platform) {
    return { ok: false, error: "invalid_token" };
  }
  if (isExpired(activeSession.expiresAt)) {
    await redis.del(activeKey);
    return { ok: false, error: "expired_token" };
  }

  const lockKey = verifiedSocialLockKey(token);
  const lockAcquired = await redis.set(lockKey, "1", {
    nx: true,
    ex: VERIFIED_SOCIAL_LOCK_TTL_SECONDS,
  });
  if (!lockAcquired) {
    return { ok: false, error: "invalid_token" };
  }

  try {
    // Re-read after lock to make token consumption effectively one-time under concurrent requests.
    const lockedSession = await redis.get<VerifiedSocialSession>(activeKey);
    if (!lockedSession) {
      return { ok: false, error: "invalid_token" };
    }
    if (lockedSession.wallet !== wallet) {
      return { ok: false, error: "wallet_mismatch" };
    }
    if (lockedSession.platform !== args.platform) {
      return { ok: false, error: "invalid_token" };
    }
    if (isExpired(lockedSession.expiresAt)) {
      await redis.del(activeKey);
      return { ok: false, error: "expired_token" };
    }

    await redis.del(activeKey);
    await redis.set(verifiedSocialUsedKey(token), new Date().toISOString(), {
      ex: VERIFIED_SOCIAL_USED_TTL_SECONDS,
    });

    const meta = (await redis.get<VerifiedSocialSessionMeta>(metaKey)) || {
      id: token,
      wallet: lockedSession.wallet,
      platform: lockedSession.platform,
      issuedAt: lockedSession.issuedAt,
      expiresAt: lockedSession.expiresAt,
    };
    await redis.set(
      metaKey,
      { ...meta, usedAt: new Date().toISOString() },
      { ex: VERIFIED_SOCIAL_META_TTL_SECONDS }
    );

    return { ok: true, session: lockedSession };
  } finally {
    await redis.del(lockKey);
  }
}
