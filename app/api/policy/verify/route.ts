import { NextRequest, NextResponse } from "next/server";
import { verifyPolicyToken } from "@/lib/server/policy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    const wallet = body.wallet ? String(body.wallet).trim() : null;

    if (!token) {
      return NextResponse.json({ valid: false, error: "Missing token" }, { status: 400 });
    }

    const result = verifyPolicyToken(token);
    if (!result.valid || !result.payload) {
      return NextResponse.json({ valid: false, error: result.error || "Invalid token" }, { status: 401 });
    }

    if (wallet && wallet !== result.payload.wallet) {
      return NextResponse.json({ valid: false, error: "Wallet mismatch" }, { status: 401 });
    }

    return NextResponse.json({ valid: true, payload: result.payload });
  } catch (err) {
    return NextResponse.json({ valid: false, error: err instanceof Error ? err.message : "Token verification failed" }, { status: 500 });
  }
}
