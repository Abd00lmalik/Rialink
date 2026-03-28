import { NextRequest, NextResponse } from "next/server";
import { getProofs } from "@/lib/server/proof-storage";
import { deriveTrustLevel } from "@/lib/trust-level";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: { wallet: string } }
) {
  try {
    const wallet = String(context.params.wallet || "").trim();
    if (!wallet) {
      return NextResponse.json({ error: "wallet is required" }, { status: 400 });
    }

    const proofs = (await getProofs(wallet)).filter((proof) => proof.verified !== false);
    const identities = proofs.map((proof) => ({
      platform: proof.platform,
      username: proof.username,
      user_id: proof.userId,
      verified: true,
      verified_at: proof.verifiedAt,
    }));

    // Minimal integration-first response with no internal proof internals.
    return NextResponse.json({
      wallet,
      identities,
      trust_level: deriveTrustLevel(proofs),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification lookup failed" },
      { status: 500 }
    );
  }
}
