import { NextRequest, NextResponse } from "next/server";
import { verifyPolicyAccessToken } from "@/lib/server/policy";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return publicCorsOptions("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = await checkRateLimit({
    key: `policy-verify:${ip}`,
    limit: 120,
    windowSeconds: 60,
  });
  if (!rate.ok) {
    return withPublicCors(
      NextResponse.json(
        { valid: false, error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
        }
      ),
      "POST, OPTIONS"
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const accessToken = String(body?.accessToken || "").trim();
  if (!accessToken) {
    return withPublicCors(
      NextResponse.json(
        { valid: false, error: "Malformed token", code: "malformed_token" },
        { status: 400 }
      ),
      "POST, OPTIONS"
    );
  }

  try {
    const result = verifyPolicyAccessToken(accessToken);
    if (!result.valid) {
      const status =
        result.errorCode === "invalid_signature"
          ? 401
          : result.errorCode === "expired_token"
          ? 410
          : 400;
      return withPublicCors(
        NextResponse.json(
          { valid: false, error: result.error, code: result.errorCode },
          { status }
        ),
        "POST, OPTIONS"
      );
    }

    return withPublicCors(
      NextResponse.json({
        valid: true,
        wallet: result.payload.wallet,
        policy: result.payload.policy,
        issuedAt: result.payload.issuedAt,
        expiresAt: result.payload.expiresAt,
        expired: false,
      }),
      "POST, OPTIONS"
    );
  } catch (error) {
    console.error("POST /api/policy/verify failed", error);
    return withPublicCors(
      NextResponse.json(
        { valid: false, error: "Internal server error", code: "internal_error" },
        { status: 500 }
      ),
      "POST, OPTIONS"
    );
  }
}
