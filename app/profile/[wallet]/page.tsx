"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, LogOut } from "lucide-react";
import { PlatformGrid } from "@/components/verification/PlatformGrid";
import { ProofBadge } from "@/components/verification/ProofBadge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Divider } from "@/components/ui/Divider";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { generateAvatarColor } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";
import { MOCK_WALLET, MOCK_PROOFS } from "@/lib/mock-data";
import type { ProofRecord, VerificationState, Platform } from "@/lib/types";

const PLATFORMS: Platform[] = ["github", "discord", "farcaster"];

interface PageProps {
  params: { wallet: string };
}

export default function ProfilePage({ params }: PageProps) {
  const rawWallet = params.wallet;
  const isDemo = rawWallet === "demo";
  const wallet = isDemo ? MOCK_WALLET : rawWallet;

  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { copy: copyLink, copied: linkCopied } = useCopyToClipboard();

  useEffect(() => {
    if (isDemo) {
      setProofs(MOCK_PROOFS);
      setIsLoading(false);
      return;
    }

    fetch(`/api/proof?wallet=${wallet}`)
      .then((r) => r.json())
      .then((data) => setProofs(data?.proofs || []))
      .catch(() => setProofs([]))
      .finally(() => setIsLoading(false));
  }, [wallet, isDemo]);

  const verifications: VerificationState[] = useMemo(
    () =>
      PLATFORMS.map((platform) => {
        const proof = proofs.find((p) => p.platform === platform);
        return proof
          ? { platform, status: "verified" as const, proof }
          : { platform, status: "unverified" as const };
      }),
    [proofs]
  );

  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const avatarColor = generateAvatarColor(wallet);
  const verifierUrl = `${APP_URL}/verifier?wallet=${encodeURIComponent(rawWallet)}`;
  const embedCode = `<iframe src="${APP_URL}/badge/${wallet}" width="340" height="120" frameborder="0"></iframe>`;

  const handleDemoRevoke = async (_platform: Platform) => {};
  const handleDemoUpdate = (_platform: Platform) => {};
  const handleDemoFarcaster = (_data: { fid: number; username: string; custody: string; message: string; signature: string; nonce: string; domain: string; pfpUrl?: string }) => {};
  const handleDemoDisconnectAll = () => {};

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "88px 24px 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "24px", alignItems: "start" }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px", position: "sticky", top: "72px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: avatarColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 600,
                color: "#fff",
                margin: "0 auto 10px",
              }}
            >
              {wallet[0].toUpperCase()}
            </div>
            <AddressDisplay address={wallet} />
          </div>

          <Divider my="16px" />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                Identities
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{verifiedCount} / 3</span>
            </div>
            <div style={{ display: "flex", gap: "3px" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "2px",
                    background: i < verifiedCount ? "var(--success)" : "var(--border-default)",
                    transition: "background 0.2s ease",
                  }}
                />
              ))}
            </div>
          </div>

          <Divider my="16px" />

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <a
              href={`/verifier?wallet=${encodeURIComponent(rawWallet)}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                height: "38px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
              className="btn-ghost"
            >
              Open verifier <ExternalLink size={12} />
            </a>

            <button
              onClick={() => copyLink(verifierUrl)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                height: "38px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              className="btn-ghost"
            >
              <Copy size={13} />
              {linkCopied ? "Copied!" : "Copy verifier link"}
            </button>

            {verifiedCount > 0 && (
              <a
                href={`/certificate/${wallet}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: "38px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "var(--accent)",
                  color: "var(--text-inverse)",
                  border: "none",
                  textDecoration: "none",
                }}
                className="btn-primary"
              >
                View VM Card
              </a>
            )}

            {isDemo && verifiedCount > 0 && (
              <button
                onClick={handleDemoDisconnectAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  height: "38px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "transparent",
                  color: "var(--error, #f87171)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <LogOut size={13} />
                Disconnect all
              </button>
            )}
          </div>

          <Divider my="16px" />

          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "4px" }}>
              Network
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "var(--success)", fontSize: "10px" }}></span>
              Rialo Devnet
            </p>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "4px" }}>
              Your Verifications
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Link accounts to build your on-chain identity
            </p>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading verifications...</span>
            </div>
          ) : (
            <PlatformGrid
              verifications={verifications}
              wallet={wallet}
              readOnly={!isDemo}
              onRevoke={isDemo ? handleDemoRevoke : undefined}
              onUpdate={isDemo ? handleDemoUpdate : undefined}
              onFarcasterConnect={isDemo ? handleDemoFarcaster : undefined}
            />
          )}

          {verifiedCount > 0 && (
            <div
              style={{
                marginTop: "24px",
                background: "linear-gradient(135deg, #0D1117 0%, #0E1520 100%)",
                border: "1px solid rgba(92,225,230,0.25)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  {verifiedCount === 3 ? "Fully Verified Builder" : `${verifiedCount} of 3 platforms verified`}
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Share your VM Card with the world</p>
              </div>
              <a
                href={`/certificate/${wallet}`}
                style={{
                  flexShrink: 0,
                  height: "38px",
                  padding: "0 16px",
                  borderRadius: "10px",
                  background: "var(--accent)",
                  color: "var(--text-inverse)",
                  fontSize: "14px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                }}
              >
                View VM Card
              </a>
            </div>
          )}

          <div style={{ marginTop: "32px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "4px" }}>
              Proof Badge
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Embed this badge on your website or share your verifier link.
            </p>
            <ProofBadge wallet={wallet} verifications={verifications} />
            <div style={{ marginTop: "16px" }}>
              <CodeBlock title="Embed code" code={embedCode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

