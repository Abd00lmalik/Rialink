import { createHmac, timingSafeEqual } from "crypto";

function getSigningSecret(): string {
  const secret = process.env.PROOF_SIGNING_SECRET;
  if (!secret) {
    throw new Error("Missing PROOF_SIGNING_SECRET");
  }
  return secret;
}

export function signProof(proofHash: string): string {
  const normalized = String(proofHash || "").trim();
  return createHmac("sha256", getSigningSecret())
    .update(normalized)
    .digest("hex");
}

export function verifyProofSignature(proofHash: string, signature: string): boolean {
  try {
    const actual = Buffer.from(String(signature || "").trim(), "hex");
    const expected = Buffer.from(signProof(proofHash), "hex");
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
