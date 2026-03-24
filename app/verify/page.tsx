"use client";

import { Suspense, useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import dynamic from "next/dynamic";
import { Lock, ExternalLink, Copy } from "lucide-react";
import { useVerifications } from "@/hooks/useVerifications";
import { useProofSubmit } from "@/hooks/useProofSubmit";
import { useToast } from "@/hooks/useToast";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { PlatformGrid } from "@/components/verification/PlatformGrid";
import { ProofBadge } from "@/components/verification/ProofBadge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { ToastContainer } from "@/components/ui/Toast";
import { Divider } from "@/components/ui/Divider";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { generateAvatarColor } from "@/lib/utils";
import { saveProofToStorage, removeProofFromStorage } from "@/hooks/useVerifications";
import type { Platform } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function VerifyDashboard() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const wallet = publicKey?.toBase58() || null;
  const { verifications, isLoading, refetch } = useVerifications(wallet);
  const { toasts, showToast, dismissToast } = useToast();
  const { copy: copyLink, copied: linkCopied } = useCopyToClipboard();

  useProofSubmit(() => {
    refetch();
    showToast("success", "Verified!", "Your identity has been linked on-chain.");
  });

  const handleFarcasterConnect = useCallback(async (data: {
    fid: number;
    username: string;
    custody: string;
    signature: string;
  }) => {
    if (!wallet) return;
    try {
      // Step 1 — verify with farcaster API
      const verifyRes = await fetch("/api/farcaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, ...data }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error("Farcaster verify failed");

      // Step 2 — store proof
      const proofRes = await fetch("/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, platform: "farcaster", proofHash: verifyData.proofHash, usernameHash: verifyData.usernameHash, maskedUsername: verifyData.maskedUsername, followerCount: verifyData.followerCount, pfpUrl: verifyData.pfpUrl }),
      });
      if (!proofRes.ok) throw new Error("Proof store failed");

      await refetch();
      showToast("success", "Farcaster Verified!", "Your Farcaster identity is now on-chain.");
    } catch (err) {
      showToast("error", "Error", "Could not verify Farcaster identity.");
    }
  }, [wallet, refetch, showToast]);

  const handleRevoke = useCallback(async (platform: Platform) => {
    if (!wallet) return;
    try {
      const res = await fetch("/api/proof", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, platform }),
      });
      if (!res.ok) throw new Error("Failed");
      removeProofFromStorage(wallet, platform);
      await refetch();
      showToast("success", "Revoked", `${platform} verification removed.`);
    } catch {
      showToast("error", "Error", "Could not revoke verification.");
    }
  }, [wallet, refetch, showToast]);

  if (!connected || !wallet) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 40px" }}>
        <div style={{ maxWidth: "400px", width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "40px", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={20} style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "10px" }}>
            Connect your wallet
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.65 }}>
            VerifyMe works with SVM wallets. Your private key never leaves your device.
          </p>
          <button
            onClick={() => setVisible(true)}
            style={{ width: "100%", height: "44px", borderRadius: "10px", background: "var(--accent)", color: "var(--text-inverse)", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 500, fontFamily: "inherit", transition: "background 0.12s ease" }}
            className="btn-primary"
          >
            Connect wallet
          </button>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "14px" }}>
            Rialo is SVM-compatible — Solana wallets work natively
          </p>
        </div>
      </div>
    );
  }

  const avatarColor = generateAvatarColor(wallet);
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const profileUrl = `${APP_URL}/profile/${wallet}`;
  const embedCode = `<iframe src="${APP_URL}/badge/${wallet}" width="340" height="120" frameborder="0"></iframe>`;

  return (
    <>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "88px 24px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "24px", alignItems: "start" }}>

          {/* SIDEBAR */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "14px", padding: "20px", position: "sticky", top: "72px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 600, color: "#fff", margin: "0 auto 10px" }}>
                {wallet[0].toUpperCase()}
              </div>
              <AddressDisplay address={wallet} />
            </div>
            <Divider my="16px" />
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Identities</span>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{verifiedCount} / 3</span>
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: i < verifiedCount ? "var(--success)" : "var(--border-default)", transition: "background 0.2s ease" }} />
                ))}
              </div>
            </div>
            <Divider my="16px" />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <a href={`/profile/${wallet}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)", transition: "color 0.12s ease, background 0.12s ease" }} className="btn-ghost">
                View public profile <ExternalLink size={12} />
              </a>
              <button onClick={() => copyLink(profileUrl)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)", cursor: "pointer", fontFamily: "inherit" }} className="btn-ghost">
                <Copy size={13} />
                {linkCopied ? "Copied!" : "Copy profile link"}
              </button>
            </div>
            <Divider my="16px" />
            <div>
              <p style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "4px" }}>Network</p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "var(--success)", fontSize: "10px" }}>●</span>
                Rialo Devnet
              </p>
            </div>
          </div>

          {/* MAIN */}
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "4px" }}>Your Verifications</h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Link accounts to build your on-chain identity</p>
            </div>

            {isLoading ? (
              <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading verifications...</span>
              </div>
            ) : (
              <PlatformGrid
                verifications={verifications}
                wallet={wallet}
                onRevoke={handleRevoke}
                onFarcasterConnect={handleFarcasterConnect}
              />
            )}

            <div style={{ marginTop: "32px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "4px" }}>Proof Badge</h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>Embed this badge on your website or share your profile link.</p>
              <ProofBadge wallet={wallet} verifications={verifications} />
              <div style={{ marginTop: "16px" }}>
                <CodeBlock title="Embed code" code={embedCode} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <VerifyDashboard />
    </Suspense>
  );
}



