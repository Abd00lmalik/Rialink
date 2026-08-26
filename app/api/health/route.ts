import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, boolean> = {};

  let redisOk = false;
  try {
    const redis = Redis.fromEnv();
    const probe = `health:${Date.now()}`;
    await redis.set(probe, "1", { ex: 30 });
    redisOk = (await redis.get(probe)) === "1";
    await redis.del(probe);
  } catch {
    redisOk = false;
  }
  checks.redis = redisOk;

  checks.proofSigningSecret = Boolean(
    String(process.env.PROOF_SIGNING_SECRET || process.env.POLICY_SIGNING_SECRET || "").trim()
  );
  checks.policySigningSecret = Boolean(String(process.env.POLICY_SIGNING_SECRET || "").trim());

  const healthy = checks.redis;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
