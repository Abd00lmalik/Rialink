import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import bs58 from "bs58";
import nacl from "tweetnacl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANCHOR_FEE_KELVIN = 5_000;
const ANCHOR_LOW_BALANCE_KELVIN = 100_000;
const DEFAULT_RIALO_RPC_URL = "https://devnet.rialo.io:4101";

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
      const got = await redis.get(probe);
      await redis.del(probe);
      redisOk = String(got) === "1";
      if (redisOk) {
        redisDetail = `connected: ${host}`;
      } else {
        redisDetail = `roundtrip_failed: ${host} responded; get returned ${JSON.stringify(got) ?? "undefined"} (${typeof got})`;
      }
    } catch (error) {
      redisDetail = `${host} -> ${classifyRedisFailure(error)}`;
    }
  }

  const healthy = checks.redis = redisOk;

  // Anchor wallet (Rialo) check. Optional until anchoring ships: an
  // unconfigured wallet reports configured:false and does not affect status.
  let anchorOk = true;
  let anchorDetail: Record<string, unknown> = { configured: false };

  const anchorSecretB58 = String(process.env.RIALINK_ANCHOR_SECRET || "").trim();
  const rialoRpcUrl =
    String(process.env.RIALO_RPC_URL || DEFAULT_RIALO_RPC_URL).trim() || DEFAULT_RIALO_RPC_URL;

  if (anchorSecretB58) {
    try {
      const seed = bs58.decode(anchorSecretB58);
      if (seed.length !== nacl.sign.seedLength) {
        throw new Error(`secret must decode to ${nacl.sign.seedLength} bytes, got ${seed.length}`);
      }
      const address = bs58.encode(nacl.sign.keyPair.fromSeed(seed).publicKey);

      let res: Response;
      try {
        res = await fetch(rialoRpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [{ address }] }),
          signal: AbortSignal.timeout(4_000),
        });
      } catch (error) {
        throw new Error(`rpc_unreachable: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!res.ok) {
        throw new Error(`rpc_http_${res.status}`);
      }

      const payload = (await res.json()) as {
        result?: { value?: number | string };
        error?: { message?: string };
      };
      if (payload.error) {
        throw new Error(`rpc_error: ${String(payload.error.message || "unknown").slice(0, 120)}`);
      }

      const kelvin = Number(payload.result?.value);
      if (!Number.isFinite(kelvin) || kelvin < 0) {
        throw new Error(`unexpected_response: balance value missing or invalid`);
      }

      anchorDetail = {
        configured: true,
        rpc: rialoRpcUrl,
        address,
        balanceKelvin: Math.floor(kelvin).toString(),
        balanceRlo: (Math.floor(kelvin) / 1e9).toFixed(6),
        anchorsRemainingApprox: Math.floor(kelvin / ANCHOR_FEE_KELVIN),
        lowBalance: kelvin < ANCHOR_LOW_BALANCE_KELVIN,
      };
    } catch (error) {
      anchorOk = false;
      anchorDetail = {
        configured: true,
        rpc: rialoRpcUrl,
        error: `anchor_check_failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 160)}`,
      };
    }
  }
  checks.anchorWallet = anchorOk;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      redisDetail,
      anchorDetail,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
