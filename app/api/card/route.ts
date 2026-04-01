import { NextRequest, NextResponse } from "next/server";
import type { ProofRecord } from "@/lib/types";
import { resolveWalletFromCardId, getProofs, getIdentityRoot } from "@/lib/server/proof-storage";
import { toPublicProof } from "@/lib/server/public-proof";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";

export async function OPTIONS() {
  return publicCorsOptions("GET, OPTIONS");
}

export async function GET(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const rate = await checkRateLimit({
      key: `card-lookup:${ip}`,
      limit: 90,
      windowSeconds: 60,
    });
    if (!rate.ok) {
      return withPublicCors(
        NextResponse.json(
          { success: false, error: "Too many requests. Please retry shortly." },
          {
            status: 429,
            headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
          }
        ),
        "GET, OPTIONS"
      );
    }

    const cardId = String(req.nextUrl.searchParams.get("cardId") || "").trim().toUpperCase();
    if (!cardId) {
      return withPublicCors(
        NextResponse.json({ success: false, error: "cardId is required" }, { status: 400 }),
        "GET, OPTIONS"
      );
    }

    const wallet = await resolveWalletFromCardId(cardId);
    if (!wallet) {
      return withPublicCors(
        NextResponse.json({ success: false, error: "Card not found" }, { status: 404 }),
        "GET, OPTIONS"
      );
    }

    const proofs = (await getProofs(wallet)) as ProofRecord[];
    const identityRoot = await getIdentityRoot(wallet);

    return withPublicCors(
      NextResponse.json({
        success: true,
        cardId,
        wallet,
        identityRoot,
        proofs: proofs.map((proof) => toPublicProof(proof, { includeProofHash: true })),
      }),
      "GET, OPTIONS"
    );
  } catch (e) {
    console.error("GET /api/card failed", e);
    return withPublicCors(
      NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 }),
      "GET, OPTIONS"
    );
  }
}

