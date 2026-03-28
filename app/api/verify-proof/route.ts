import { NextRequest, NextResponse } from "next/server";
import { verifyBindingProofToken } from "@/lib/server/binding-proof";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bindingProof = String(body?.binding_proof || "").trim();
    if (!bindingProof) {
      return NextResponse.json(
        { valid: false, error: "binding_proof is required" },
        { status: 400 }
      );
    }

    const verify = verifyBindingProofToken(bindingProof);
    if (!verify.valid) {
      return NextResponse.json(
        { valid: false, error: verify.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      wallet: verify.payload.wallet,
      platform: verify.payload.platform,
      user_id: verify.payload.userId,
      username: verify.payload.username,
      verified_at: verify.payload.verifiedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: err instanceof Error ? err.message : "Proof verification failed",
      },
      { status: 500 }
    );
  }
}
