function normalizeHost(value: string): string {
  return value.trim().toLowerCase();
}

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
  return allowed.has(normalized);
}
