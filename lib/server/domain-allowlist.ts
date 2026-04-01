function normalizeHost(value: string): string {
  return value.trim().toLowerCase();
}

const DEFAULT_TRUSTED_DOMAINS = [
  "localhost",
  "localhost:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
  "verifyme-two.vercel.app",
  "rialink-two.vercel.app",
];

function hostFromUrl(urlLike: string): string | null {
  const input = String(urlLike || "").trim();
  if (!input) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const host = new URL(withProtocol).host;
    return host ? normalizeHost(host) : null;
  } catch {
    return null;
  }
}

export function getAllowedProofDomains(): Set<string> {
  const allowed = new Set<string>();
  for (const host of DEFAULT_TRUSTED_DOMAINS) {
    allowed.add(normalizeHost(host));
  }

  const appUrlHost = hostFromUrl(process.env.NEXT_PUBLIC_APP_URL || "");
  if (appUrlHost) {
    allowed.add(appUrlHost);
  }

  const extra = String(process.env.TRUSTED_WALLET_PROOF_DOMAINS || "").trim();
  if (extra) {
    for (const row of extra.split(",")) {
      const host = hostFromUrl(row);
      if (host) allowed.add(host);
    }
  }
  return allowed;
}

export function isAllowedProofDomain(domain: string): boolean {
  const normalized = normalizeHost(domain);
  if (!normalized) return false;
  const allowed = getAllowedProofDomains();
  if (allowed.has(normalized)) return true;

  // Keep local development usable even when env host config is missing.
  if (process.env.NODE_ENV !== "production") {
    return normalized.startsWith("localhost") || normalized.startsWith("127.0.0.1");
  }

  return false;
}
