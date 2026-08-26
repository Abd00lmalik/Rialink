/**
 * GET/POST /api/identity/:wallet/reputation
 *
 * Cross-app reputation signals from Rialo dApps.
 * GET: returns aggregated reputation score
 * POST: submit a new reputation signal
 */

import { NextRequest, NextResponse } from "next/server";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";
import { isValidWalletAddress } from "@/lib/server/wallet";
import { getAggregate, submitSignal, getSignals } from "@/lib/reputation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return publicCorsOptions("GET, POST, OPTIONS");
}

export async function GET(
  _req: NextRequest,
  context: { params: { wallet: string } }
) {
  const wallet = String(context.params.wallet || "").trim();

  if (!wallet || !isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Valid wallet address required" }, { status: 400 }),
      "GET, OPTIONS"
    );
  }

  const aggregate = await getAggregate(wallet);
  const signals = await getSignals(wallet);

  return withPublicCors(
    NextResponse.json({
      schema: "rialink.reputation.v1",
      ...aggregate,
      recentSignals: signals.slice(0, 20).map((s) => ({
        source: s.source,
        signal: s.signal,
        value: s.value,
        submittedAt: s.submittedAt,
      })),
      queriedAt: new Date().toISOString(),
    }),
    "GET, OPTIONS"
  );
}

export async function POST(
  req: NextRequest,
  context: { params: { wallet: string } }
) {
  const wallet = String(context.params.wallet || "").trim();

  if (!wallet || !isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Valid wallet address required" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  const body = await req.json().catch(() => null);
  const source = String(body?.source || "").trim();
  const signal = String(body?.signal || "").trim();
  const value = Number(body?.value);

  if (!source || !signal || isNaN(value)) {
    return withPublicCors(
      NextResponse.json(
        { error: "source (string), signal (string), and value (number -1 to 1) are required" },
        { status: 400 }
      ),
      "POST, OPTIONS"
    );
  }

  if (value < -1 || value > 1) {
    return withPublicCors(
      NextResponse.json({ error: "value must be between -1 and 1" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  const metadata = body?.metadata && typeof body.metadata === "object"
    ? body.metadata
    : undefined;

  const result = await submitSignal(wallet, source, signal, value, metadata);

  if (!result) {
    return withPublicCors(
      NextResponse.json({ error: "Failed to submit signal" }, { status: 500 }),
      "POST, OPTIONS"
    );
  }

  return withPublicCors(NextResponse.json(result), "POST, OPTIONS");
}
