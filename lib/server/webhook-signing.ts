/**
 * HMAC webhook signing for Rialink webhooks.
 * Each webhook delivery is signed with a shared secret.
 */

import { createHmac, randomBytes } from "crypto";

const WEBHOOK_SECRET_PREFIX = "whsec_";

/**
 * Generate a new webhook secret.
 */
export function generateWebhookSecret(): string {
  return WEBHOOK_SECRET_PREFIX + randomBytes(32).toString("hex");
}

/**
 * Sign a webhook payload.
 * Returns the signature to include in the X-Rialink-Signature header.
 */
export function signWebhook(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret).update(toSign).digest("hex");
  return `v1=${signature},t=${timestamp}`;
}

/**
 * Verify a webhook signature.
 * Use this to verify incoming webhooks from Rialink.
 */
export function verifyWebhook(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  try {
    const parts = signatureHeader.split(",").reduce((acc, part) => {
      const [key, value] = part.split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const signature = parts.v1;
    const timestamp = parseInt(parts.t, 10);

    if (!signature || isNaN(timestamp)) return false;

    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) return false;

    // Verify signature
    const expected = signWebhook(payload, secret).split(",")[0].split("=")[1];
    return signature === expected;
  } catch {
    return false;
  }
}
