import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function classifyRedisFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const msg = raw.slice(0, 160);
  if (/401|unauthorized|invalid.*token|WRONGPASS/i.test(raw)) {
    return "auth_rejected: the token was rejected (401). Token does not belong to this database.";
  }
  if (/404/i.test(raw)) {
    return "not_found: the URL does not point to a live REST endpoint (404).";
  }
  if (/fetch failed|ENOTFOUND|getaddrinfo|ECONNREFUSED|EAI_AGAIN|certificate|TLS/i.test(raw)) {
    return `network_error: ${msg}`;
  }
  return `error: ${msg}`;
}

export async function GET() {
  const checks: Record<string, boolean> = {};

  checks.proofSigningSecret = Boolean(
    String(process.env.PROOF_SIGNING_SECRET || process.env.POLICY_SIGNING_SECRET || "").trim()
  );
  checks.policySigningSecret = Boolean(String(process.env.POLICY_SIGNING_SECRET || "").trim());

  let redisOk = false;
  let redisDetail: string | undefined;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

  if (!url || !token) {
    redisDetail =
      "config_missing: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set in this deployment environment";
  } else if (!/^https:\/\//i.test(url.trim())) {
    redisDetail = `bad_url: expected an https:// REST URL, got "${url.trim().slice(0, 16)}..."`;
  } else {
    let host = "";
    try {
      host = new URL(url).host;
    } catch {
      host = "unparseable-url";
    }
    try {
      const redis = new Redis({ url: url.trim(), token: token.trim() });
      const probe = `health:${Date.now()}`;
      await redis.set(probe, "1", { ex: 30 });
      redisOk = (await redis.get(probe)) === "1";
      await redis.del(probe);
      if (redisOk) {
        redisDetail = `connected: ${host}`;
      } else {
        redisDetail = `roundtrip_failed: ${host} responded but set/get did not verify`;
      }
    } catch (error) {
      redisDetail = `${host} -> ${classifyRedisFailure(error)}`;
    }
  }

  const healthy = checks.redis = redisOk;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      redisDetail,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
