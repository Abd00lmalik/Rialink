import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getProofs } from "@/lib/server/proof-storage";
import { deriveTrustLevel } from "@/lib/trust-level";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: { code, message },
    },
    { status }
  );
}

function isValidWallet(wallet: string): boolean {
  try {
    new PublicKey(wallet);
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: { wallet: string } }
) {
  try {
    const wallet = String(context.params.wallet || "").trim();
    if (!wallet) {
      return errorResponse(400, "missing_wallet", "wallet is required");
    }
    if (!isValidWallet(wallet)) {
      return errorResponse(400, "invalid_wallet", "wallet must be a valid Solana address");
    }

    const proofs = (await getProofs(wallet))
      .filter((proof) => proof.verified !== false)
      .sort((a, b) => {
        if (a.platform === b.platform) {
          return a.userId.localeCompare(b.userId);
        }
        return a.platform.localeCompare(b.platform);
      });
    const identities = proofs.map((proof) => ({
      platform: proof.platform,
      username: proof.username,
      user_id: proof.userId,
      verified: true,
      verified_at: proof.verifiedAt,
    }));

    // Integrator response intentionally excludes internals like hashes and binding metadata.
    return NextResponse.json({
      wallet,
      identities,
      trust_level: deriveTrustLevel(proofs),
    });
  } catch {
    return errorResponse(500, "verify_lookup_failed", "Verification lookup failed");
  }
}
