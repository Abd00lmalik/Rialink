/**
 * POST/GET/DELETE /api/webhooks
 *
 * CRUD for webhook registrations.
 * POST: Register a new webhook
 * GET: List webhooks for a wallet
 * DELETE: Remove a webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { withPublicCors } from "@/lib/server/cors";
import { isValidWalletAddress, normalizeWallet } from "@/lib/server/wallet";
import { registerWebhook, listWebhooks, deleteWebhook } from "@/lib/server/webhook-dispatcher";
import { generateWebhookSecret } from "@/lib/server/webhook-signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: NextRequest) {
  const wallet = normalizeWallet(req.nextUrl.searchParams.get("wallet"));
  if (!wallet || !isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Valid wallet address required" }, { status: 400 }),
      "GET, OPTIONS"
    );
  }

  const webhooks = await listWebhooks(wallet);
  // Strip secrets from response
  const safe = webhooks.map(({ secret, ...rest }) => rest);

  return withPublicCors(NextResponse.json({ webhooks: safe }), "GET, OPTIONS");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const wallet = normalizeWallet(body?.wallet);
  const url = body?.url;

  if (!wallet || !isValidWalletAddress(wallet)) {
    return withPublicCors(
      NextResponse.json({ error: "Valid wallet address required" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return withPublicCors(
      NextResponse.json({ error: "Valid URL required" }, { status: 400 }),
      "POST, OPTIONS"
    );
  }

  const events = Array.isArray(body.events)
    ? body.events.filter((e: string) =>
        ["proof.created", "proof.revoked", "identity.updated"].includes(e)
      )
    : ["proof.created", "identity.updated"];

  const secret = generateWebhookSecret();
  const webhook = await registerWebhook(wallet, url, secret, events);

  if (!webhook) {
    return withPublicCors(
      NextResponse.json({ error: "Failed to register webhook (max 10 per wallet)" }, { status: 500 }),
      "POST, OPTIONS"
    );
  }

  // Return the secret — this is the only time it's shown
  return withPublicCors(
    NextResponse.json({
      id: webhook.id,
      wallet: webhook.wallet,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      createdAt: webhook.createdAt,
    }),
    "POST, OPTIONS"
  );
}

export async function DELETE(req: NextRequest) {
  const wallet = normalizeWallet(req.nextUrl.searchParams.get("wallet"));
  const webhookId = req.nextUrl.searchParams.get("id");

  if (!wallet || !isValidWalletAddress(wallet) || !webhookId) {
    return withPublicCors(
      NextResponse.json({ error: "wallet and id are required" }, { status: 400 }),
      "DELETE, OPTIONS"
    );
  }

  const deleted = await deleteWebhook(wallet, webhookId);
  return withPublicCors(
    NextResponse.json({ deleted }),
    "DELETE, OPTIONS"
  );
}
