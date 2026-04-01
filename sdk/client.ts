import type { VerifyResponse, Proof } from "./types";

function normalizeProofs(wallet: string, proofs: unknown[]): Proof[] {
  return proofs
    .filter((item) => !!item && typeof item === "object")
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        wallet,
        platform: String(row.platform || ""),
        userId: String(row.userId || row.user_id || ""),
        ...(row.username ? { username: String(row.username) } : {}),
        proof_hash: String(row.proof_hash || row.proofHash || ""),
        signature: String(row.signature || ""),
        nonce: String(row.nonce || ""),
        issuedAt: Number(row.issuedAt || row.issued_at || 0),
        version: String(row.version || "v1"),
      };
    });
}

export class RialinkClient {
  baseUrl: string;

  constructor(baseUrl = "https://rialink-two.vercel.app") {
    const normalizedBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
    if (!normalizedBaseUrl) {
      throw new Error("RialinkClient requires a valid baseUrl");
    }
    this.baseUrl = normalizedBaseUrl;
  }

  async verifyWallet(wallet: string): Promise<VerifyResponse> {
    const normalizedWallet = String(wallet || "").trim();
    const res = await fetch(
      `${this.baseUrl}/api/verify/${encodeURIComponent(normalizedWallet)}`
    );
    if (!res.ok) throw new Error("Verification failed");
    const data = (await res.json()) as Record<string, unknown>;

    const responseWallet = String(data.wallet || normalizedWallet);
    const proofs = Array.isArray(data.proofs) ? normalizeProofs(responseWallet, data.proofs) : [];

    return {
      valid: Boolean(data.valid),
      wallet: responseWallet,
      proofs,
    };
  }
}
