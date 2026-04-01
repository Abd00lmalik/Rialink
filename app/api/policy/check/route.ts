import { NextRequest, NextResponse } from "next/server";
import {
  createPolicyAccessToken,
  evaluateWalletPolicy,
  mergePolicyRequirements,
  normalizePolicyRequirements,
} from "@/lib/server/policy";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { isValidWalletAddress } from "@/lib/server/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return publicCorsOptions("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = await checkRateLimit({
    key: `policy-check:${ip}`,
    limit: 90,
    windowSeconds: 60,
  });
  if (!rate.ok) {
    return withPublicCors(
      NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
        }
      ),
      "POST, OPTIONS"
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const wallet = String(body?.wallet || "").trim();
  if (!wallet) {
    return withPublicCors(
      NextResponse.json({ error: "wallet is required" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }
  if (!isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Invalid wallet address" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  const policy = String(body?.policy || "custom").trim().toLowerCase();
  const requirements = mergePolicyRequirements(
    policy,
    normalizePolicyRequirements(body?.requirements)
  );

  try {
    const evaluation = await evaluateWalletPolicy({
      wallet,
      policy,
      requirements,
    });

    const accessToken = evaluation.passed
      ? createPolicyAccessToken({
          wallet,
          policy,
          checks: evaluation.checks,
        })
      : undefined;

    return withPublicCors(
      NextResponse.json({
        wallet: evaluation.wallet,
        policy: evaluation.policy,
        passed: evaluation.passed,
        trustLevel: evaluation.trustLevel,
        evaluatedAt: evaluation.evaluatedAt,
        checks: evaluation.checks,
        ...(accessToken ? { accessToken } : {}),
      }),
      "POST, OPTIONS"
    );
  } catch (error) {
    console.error("POST /api/policy/check failed", { wallet, error });
    return withPublicCors(
      NextResponse.json({ error: "Internal server error" }, { status: 500 }),
      "POST, OPTIONS"
    );
  }
}
