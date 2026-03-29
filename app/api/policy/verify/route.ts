import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenPayload {
  wallet: string;
  policy: string;
  issuedAt: string;
  expiresAt: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function withCors(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  const secret = process.env.PROOF_SECRET || "rialink-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function parseToken(accessToken: string): {
  payload?: TokenPayload;
  error?: "Malformed token" | "Invalid signature";
} {
  if (!accessToken.startsWith("vm_")) {
    return { error: "Malformed token" };
  }

  const tokenBody = accessToken.slice(3);
  const parts = tokenBody.split(".");
  if (parts.length !== 2) {
    return { error: "Malformed token" };
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return { error: "Malformed token" };
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqualHex(signature, expectedSignature)) {
    return { error: "Invalid signature" };
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    if (
      !parsed ||
      typeof parsed.wallet !== "string" ||
      typeof parsed.policy !== "string" ||
      typeof parsed.issuedAt !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return { error: "Malformed token" };
    }
    return { payload: parsed };
  } catch {
    return { error: "Malformed token" };
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const accessToken = String(body?.accessToken || "").trim();
  if (!accessToken) {
    return withCors(
      NextResponse.json({ valid: false, error: "Malformed token" }, { status: 400 })
    );
  }

  const result = parseToken(accessToken);
  if (!result.payload) {
    return withCors(
      NextResponse.json({ valid: false, error: result.error || "Malformed token" })
    );
  }

  const issuedAtTs = Date.parse(result.payload.issuedAt);
  const expiresAtTs = Date.parse(result.payload.expiresAt);
  if (!Number.isFinite(issuedAtTs) || !Number.isFinite(expiresAtTs)) {
    return withCors(
      NextResponse.json({ valid: false, error: "Malformed token" })
    );
  }

  if (Date.now() > expiresAtTs) {
    return withCors(
      NextResponse.json({ valid: false, error: "Token expired" })
    );
  }

  return withCors(
    NextResponse.json({
      valid: true,
      wallet: result.payload.wallet,
      policy: result.payload.policy,
      issuedAt: result.payload.issuedAt,
      expiresAt: result.payload.expiresAt,
      expired: false,
    })
  );
}

