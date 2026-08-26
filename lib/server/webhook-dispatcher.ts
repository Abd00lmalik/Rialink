/**
 * Webhook dispatcher for Rialink.
 * Sends webhook notifications when verification status changes.
 */

import { Redis } from "@upstash/redis";
import { signWebhook } from "./webhook-signing";

const WEBHOOK_MAX_PER_WALLET = 10;
const MAX_DELIVERY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 5000, 15000];

export interface WebhookRegistration {
  id: string;
  wallet: string;
  url: string;
  secret: string;
  events: string[];
  createdAt: string;
  active: boolean;
}

export interface WebhookPayload {
  event: "proof.created" | "proof.revoked" | "identity.updated";
  wallet: string;
  platform?: string;
  trustLevel?: string;
  proofHash?: string;
  chain?: string;
  txSignature?: string;
  timestamp: string;
}

function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

/**
 * Register a new webhook.
 */
export async function registerWebhook(
  wallet: string,
  url: string,
  secret: string,
  events: string[] = ["proof.created", "identity.updated"]
): Promise<WebhookRegistration | null> {
  const redis = getRedis();
  if (!redis) return null;

  // Check max webhooks per wallet
  const existing = await redis.lrange<Record<string, unknown>>(`webhooks:${wallet}`, 0, -1);
  if (existing.length >= WEBHOOK_MAX_PER_WALLET) return null;

  const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const registration: WebhookRegistration = {
    id,
    wallet,
    url,
    secret,
    events,
    createdAt: new Date().toISOString(),
    active: true,
  };

  await redis.lpush(`webhooks:${wallet}`, JSON.stringify(registration));
  return registration;
}

/**
 * List webhooks for a wallet.
 */
export async function listWebhooks(wallet: string): Promise<WebhookRegistration[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const rows = await redis.lrange<Record<string, unknown>>(`webhooks:${wallet}`, 0, -1);
    return rows
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .map((r) => ({
        id: String(r.id || ""),
        wallet: String(r.wallet || wallet),
        url: String(r.url || ""),
        secret: String(r.secret || ""),
        events: Array.isArray(r.events) ? r.events.map(String) : ["proof.created", "identity.updated"],
        createdAt: String(r.createdAt || ""),
        active: r.active !== false,
      }));
  } catch {
    return [];
  }
}

/**
 * Delete a webhook.
 */
export async function deleteWebhook(wallet: string, webhookId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const rows = await redis.lrange<string>(`webhooks:${wallet}`, 0, -1);
    const idx = rows.findIndex((row) => {
      try {
        const parsed = JSON.parse(row);
        return parsed.id === webhookId;
      } catch {
        return false;
      }
    });
    if (idx === -1) return false;
    await redis.lrem(`webhooks:${wallet}`, 1, rows[idx]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dispatch webhooks for an event.
 */
export async function dispatchWebhooks(
  wallet: string,
  payload: WebhookPayload
): Promise<void> {
  const webhooks = await listWebhooks(wallet);
  const matching = webhooks.filter(
    (wh) => wh.active && wh.events.includes(payload.event)
  );

  for (const webhook of matching) {
    deliverWebhook(webhook, payload);
  }
}

/**
 * Deliver a single webhook with retries.
 */
async function deliverWebhook(
  webhook: WebhookRegistration,
  payload: WebhookPayload,
  attempt: number = 0
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signWebhook(body, webhook.secret);

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Rialink-Signature": signature,
        "X-Rialink-Event": payload.event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok && attempt < MAX_DELIVERY_ATTEMPTS - 1) {
      scheduleRetry(webhook, payload, attempt + 1);
    }
  } catch {
    if (attempt < MAX_DELIVERY_ATTEMPTS - 1) {
      scheduleRetry(webhook, payload, attempt + 1);
    }
  }
}

function scheduleRetry(
  webhook: WebhookRegistration,
  payload: WebhookPayload,
  attempt: number
): void {
  const delay = RETRY_DELAYS_MS[attempt] || 15000;
  setTimeout(() => deliverWebhook(webhook, payload, attempt), delay);
}
