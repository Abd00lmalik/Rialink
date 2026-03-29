"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddressDisplay } from "@/components/ui/AddressDisplay";

type TrustLevel = "high" | "medium" | "low" | "none";
type Platform = "github" | "discord" | "farcaster";

interface VerifyProof {
  platform: Platform;
  username: string;
  fullName?: string;
  pfpUrl?: string;
  proofHash: string;
  verifiedAt: string;
  repoCount?: number;
  commitCount?: number;
  followerCount?: number;
  serverCount?: number;
}

interface VerifyResponse {
  wallet: string;
  valid: boolean;
  trustLevel: TrustLevel;
  verifiedPlatforms: Platform[];
  totalVerified: number;
  maxPossible: number;
  proofs: VerifyProof[];
  queriedAt: string;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  github: "GitHub",
  discord: "Discord",
  farcaster: "Farcaster",
};

const TRUST_LABELS: Record<TrustLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function trustTone(level: TrustLevel): string {
  if (level === "high") return "var(--success)";
  if (level === "medium") return "var(--accent-text)";
  if (level === "low") return "var(--text-secondary)";
  return "var(--text-muted)";
}

function platformAccent(platform: Platform): string {
  if (platform === "github") return "rgba(92,225,230,0.2)";
  if (platform === "discord") return "rgba(139,92,246,0.22)";
  return "rgba(244,114,182,0.22)";
}

function VerifierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletParam = searchParams.get("wallet")?.trim() ?? "";

  const [walletInput, setWalletInput] = useState(walletParam);
  const [identity, setIdentity] = useState<VerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLookup, setHasLookup] = useState(false);

  const fetchIdentity = useCallback(async (wallet: string) => {
    const trimmed = wallet.trim();
    if (!trimmed) {
      setIdentity(null);
      setHasLookup(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasLookup(true);

    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as VerifyResponse | { error?: string };

      if (!response.ok || !("wallet" in data)) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Could not verify this wallet right now.";
        setIdentity(null);
        setError(message);
        return;
      }

      setIdentity(data);
    } catch {
      setIdentity(null);
      setError("Could not verify this wallet right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setWalletInput(walletParam);
    if (!walletParam) {
      setIdentity(null);
      setHasLookup(false);
      setError(null);
      setIsLoading(false);
      return;
    }
    void fetchIdentity(walletParam);
  }, [walletParam, fetchIdentity]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = walletInput.trim();
      if (!trimmed) {
        setIdentity(null);
        setHasLookup(false);
        setError("Enter a wallet address to verify.");
        return;
      }

      const currentWallet = walletParam;
      const nextPath = `/verifier?wallet=${encodeURIComponent(trimmed)}`;
      if (trimmed === currentWallet) {
        void fetchIdentity(trimmed);
      } else {
        router.replace(nextPath);
      }
    },
    [walletInput, walletParam, fetchIdentity, router]
  );

  const verifiedPlatforms = identity?.verifiedPlatforms ?? [];
  const hasProofs = (identity?.proofs?.length ?? 0) > 0;
  const trustLevel = identity?.trustLevel ?? "none";
  const progressBars = useMemo(() => [0, 1, 2], []);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "88px 24px 60px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBottom: "6px",
          }}
        >
          Public Wallet Verifier
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Look up any wallet and verify linked identities without connecting your wallet.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "14px",
          padding: "18px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={walletInput}
            onChange={(event) => setWalletInput(event.target.value)}
            placeholder="Wallet address"
            style={{
              flex: 1,
              minWidth: "260px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              padding: "0 12px",
              fontFamily: "monospace",
              fontSize: "13px",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              height: "40px",
              padding: "0 16px",
              borderRadius: "10px",
              border: "none",
              background: "var(--accent)",
              color: "var(--text-inverse)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isLoading ? "Checking..." : "Verify wallet"}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid rgba(248,113,113,0.35)",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--error, #f87171)" }}>{error}</p>
        </div>
      )}

      {!error && isLoading && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading verification data...</p>
        </div>
      )}

      {!error && !isLoading && hasLookup && identity && (
        <>
          {!hasProofs ? (
            <section
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "8px",
                }}
              >
                Result
              </p>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                Not verified
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                No verified identity proofs were found for this wallet.
              </p>
              <AddressDisplay address={identity.wallet} />
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                gap: "24px",
                alignItems: "start",
              }}
            >
              <aside
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  padding: "20px",
                  position: "sticky",
                  top: "72px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Wallet
                </p>
                <AddressDisplay address={identity.wallet} />

                <div
                  style={{
                    marginTop: "16px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    background: "var(--bg-elevated)",
                    padding: "10px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "4px",
                    }}
                  >
                    Trust level
                  </p>
                  <p style={{ margin: 0, color: trustTone(trustLevel), fontSize: "14px", fontWeight: 600 }}>
                    {TRUST_LABELS[trustLevel]}
                  </p>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Platforms
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {identity.totalVerified} / {identity.maxPossible}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "3px" }}>
                    {progressBars.map((index) => (
                      <div
                        key={index}
                        style={{
                          flex: 1,
                          height: "4px",
                          borderRadius: "2px",
                          background:
                            index < identity.totalVerified
                              ? "var(--success)"
                              : "var(--border-default)",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                    {verifiedPlatforms.map((platform) => (
                      <span
                        key={platform}
                        style={{
                          fontSize: "12px",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "999px",
                          padding: "4px 8px",
                          background: "var(--bg-elevated)",
                        }}
                      >
                        {PLATFORM_LABELS[platform]}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>

              <section>
                <div style={{ marginBottom: "16px" }}>
                  <h2
                    style={{
                      fontSize: "22px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    Verified Identities
                  </h2>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    Proof hashes are public receipts that each identity is bound to this wallet.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  {identity.proofs.map((proof, index) => (
                    <article
                      key={`${proof.platform}-${proof.proofHash}-${index}`}
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "14px",
                        padding: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {proof.pfpUrl ? (
                            <img
                              src={proof.pfpUrl}
                              alt={`${proof.username} avatar`}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid var(--border-subtle)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "50%",
                                background: platformAccent(proof.platform),
                                border: "1px solid var(--border-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              {PLATFORM_LABELS[proof.platform][0]}
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: 700 }}>
                              {proof.fullName || proof.username}
                            </p>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                              {PLATFORM_LABELS[proof.platform]}
                              {proof.fullName && proof.username
                                ? ` | @${proof.username}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--success)",
                            border: "1px solid rgba(16,185,129,0.35)",
                            borderRadius: "999px",
                            padding: "4px 10px",
                          }}
                        >
                          Verified
                        </span>
                      </div>

                      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px" }}>
                        Verified on {formatDate(proof.verifiedAt)}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                        Proof hash
                      </p>
                      <p
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: "var(--accent-text)",
                          wordBreak: "break-all",
                          marginTop: "2px",
                        }}
                      >
                        {proof.proofHash}
                      </p>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                        {proof.repoCount !== undefined && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "999px",
                              padding: "4px 8px",
                            }}
                          >
                            Repos: {proof.repoCount}
                          </span>
                        )}
                        {proof.commitCount !== undefined && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "999px",
                              padding: "4px 8px",
                            }}
                          >
                            Commits: {proof.commitCount}
                          </span>
                        )}
                        {proof.followerCount !== undefined && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "999px",
                              padding: "4px 8px",
                            }}
                          >
                            Followers: {proof.followerCount}
                          </span>
                        )}
                        {proof.serverCount !== undefined && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "999px",
                              padding: "4px 8px",
                            }}
                          >
                            Servers: {proof.serverCount}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function VerifierPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "88px 24px 60px" }}>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading verifier...</p>
        </div>
      }
    >
      <VerifierContent />
    </Suspense>
  );
}
