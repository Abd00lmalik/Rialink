import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

const redis = Redis.fromEnv();

export interface RateLimitRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export function getRequestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function checkRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const nowBucket = Math.floor(Date.now() / (rule.windowSeconds * 1000));
  const key = `rate:${rule.key}:${nowBucket}`;
  const raw = await redis.incr(key);
  const count = Number(raw || 0);
  if (count === 1) {
    await redis.expire(key, rule.windowSeconds);
  }
  const remaining = Math.max(0, rule.limit - count);
  const retryAfterSeconds = count > rule.limit ? rule.windowSeconds : 0;
  return {
    ok: count <= rule.limit,
    limit: rule.limit,
    remaining,
    retryAfterSeconds,
  };
}
