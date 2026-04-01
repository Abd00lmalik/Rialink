import { NextRequest, NextResponse } from "next/server";
import {
  verifyBindingProofToken,
  type VerifyBindingProofErrorCode,
} from "@/lib/server/binding-proof";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string) {
  return withPublicCors(
    NextResponse.json(
      {
        valid: false,
        error: { code, message },
      },
      { status }
    ),
    "POST, OPTIONS"
  );
}

function statusForProofError(code: VerifyBindingProofErrorCode): number {
  switch (code) {
    case "malformed_proof":
    case "invalid_payload":
    case "proof_hash_mismatch":
    case "proof_expired":
    case "invalid_nonce":
    case "wallet_message_mismatch":
      return 400;
    case "invalid_signature":
    case "wallet_signature_invalid":
      return 401;
    case "verification_failed":
      return 500;
    default:
      return 400;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const rate = await checkRateLimit({
      key: `verify-proof:${ip}`,
      limit: 40,
      windowSeconds: 60,
    });
    if (!rate.ok) {
      return errorResponse(
        429,
        "rate_limited",
        "Too many verification requests. Please retry shortly."
      );
    }

    const body = (await req.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const bindingProof =
      body && typeof body === "object"
        ? String(body.binding_proof || "").trim()
        : "";
    if (!bindingProof) {
      return errorResponse(400, "missing_binding_proof", "binding_proof is required");
    }

    const verify = verifyBindingProofToken(bindingProof);
    if (!verify.valid) {
      return errorResponse(
        statusForProofError(verify.error.code),
        verify.error.code,
        verify.error.message
      );
    }

    return withPublicCors(
      NextResponse.json({
        valid: true,
        wallet: verify.payload.wallet,
        platform: verify.payload.platform,
        user_id: verify.payload.userId,
        username: verify.payload.username,
        verified_at: verify.payload.verifiedAt,
      }),
      "POST, OPTIONS"
    );
  } catch {
    return errorResponse(500, "verify_proof_failed", "Proof verification failed");
  }
}

export async function OPTIONS() {
  return publicCorsOptions("POST, OPTIONS");
}
