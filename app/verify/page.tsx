"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ExternalLink, Copy, LogOut, Lock } from "lucide-react";
import { useVerifications } from "@/hooks/useVerifications";
import { useWalletProof, getStoredWalletProof } from "@/hooks/useWalletProof";
import { useToast } from "@/hooks/useToast";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { PlatformGrid } from "@/components/verification/PlatformGrid";
import { ProofBadge } from "@/components/verification/ProofBadge";
import { ToastContainer } from "@/components/ui/Toast";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { generateAvatarColor } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";
import { cardIdFromWallet } from "@/lib/card-id";
import type { Platform } from "@/lib/types";

/* --- State machine ---
   Returns the index (0-2) of the platform that gets the single
   mint fill button, or -1 if View RialCard should be mint.
   Priority: unsigned wallet > first unverified > all done.        */
function mintPriority(
  hasWalletProof: boolean,
  verifications: { platform: Platform; status: string }[]
): number {
  if (!hasWalletProof) return -2; // sign challenge is mint
  const order: Platform[] = ["github", "discord", "farcaster"];
  for (let i = 0; i < order.length; i++) {
    const v = verifications.find((x) => x.platform === order[i]);
    if (!v || v.status !== "verified") return i;
  }
  return -1; // all verified → View RialCard is mint
}

function VerifyDashboard() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const wallet = publicKey?.toBase58() || null;
  const { verifications, isLoading, refetch } = useVerifications(wallet);
  const { toasts, showToast, dismissToast } = useToast();
  const { copy: copyLink, copied: linkCopied } = useCopyToClipboard();
  const { ensureWalletProof, isSigning } = useWalletProof();
  const [hasWalletProof, setHasWalletProof] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!wallet) { setHasWalletProof(false); return; }
    setHasWalletProof(!!getStoredWalletProof(wallet));
  }, [wallet]);

  const ensureProofOrToast = useCallback(async () => {
    try {
      const proof = await ensureWalletProof();
      setHasWalletProof(true);
      return proof;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet signature required";
      showToast("error", "Wallet proof required", msg);
      return null;
    }
  }, [ensureWalletProof, showToast]);

  // OAuth callback handler
  useEffect(() => {
    const success = searchParams.get("success");
    const platform = searchParams.get("platform") as Platform | null;
    const verificationToken = searchParams.get("session");
    const errorParam = searchParams.get("error");
    const resolvedWallet = wallet || localStorage.getItem("rialink_pending_wallet");

    if (errorParam && platform) {
      showToast("error", `${platform} error`, searchParams.get("message") || "Verification failed");
      router.replace("/verify");
      return;
    }
    if (success === "true" && platform && !verificationToken) {
      showToast("error", "Verification session missing", "Please reconnect the platform.");
      router.replace("/verify");
      return;
    }
    if (success === "true" && platform && verificationToken && !resolvedWallet) {
      showToast("error", "Wallet missing", "Reconnect wallet and retry platform verification.");
      router.replace("/verify");
      return;
    }
    if (success === "true" && platform && verificationToken && resolvedWallet) {
      const walletProof = getStoredWalletProof(resolvedWallet);
      if (!walletProof) {
        showToast("error", "Wallet proof missing", "Please sign your wallet to finish verification.");
        router.replace("/verify");
        return;
      }
      fetch("/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: resolvedWallet, platform, verificationToken, walletProof }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save proof");
          localStorage.removeItem("rialink_pending_wallet");
          await refetch();
          showToast("success", `${platform.charAt(0).toUpperCase() + platform.slice(1)} Verified!`, "Identity linked and cryptographically bound to your wallet.");
        })
        .catch((err) => {
          showToast("error", "Verification failed", err instanceof Error ? err.message : "Verification failed");
        })
        .finally(() => router.replace("/verify"));
    }
  }, [searchParams]);

  const startOAuth = useCallback((platform: Platform, addr: string) => {
    localStorage.setItem("rialink_pending_wallet", addr);
    if (platform === "github") window.location.href = `/api/github?wallet=${addr}`;
    else if (platform === "discord") window.location.href = `/api/discord?wallet=${addr}`;
  }, []);

  const handleConnect = useCallback(async (platform: Platform) => {
    if (!wallet) return;
    const proof = await ensureProofOrToast();
    if (!proof) return;
    startOAuth(platform, wallet);
  }, [wallet, ensureProofOrToast, startOAuth]);

  const handleFarcasterConnect = useCallback(async (data: {
    fid: number; username: string; custody: string; message: string;
    signature: string; nonce: string; domain: string; pfpUrl?: string;
  }) => {
    if (!wallet) return;
    const walletProof = await ensureProofOrToast();
    if (!walletProof) return;
    try {
      const verifyRes = await fetch("/api/farcaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, ...data }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData?.error || "Farcaster verify failed");
      const saveRes = await fetch("/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, platform: "farcaster", verificationToken: String(verifyData.verificationToken || ""), walletProof }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData?.success) throw new Error(saveData?.error || "Could not save Farcaster proof");
      await refetch();
      showToast("success", "Farcaster Verified!", "Identity linked and cryptographically bound.");
    } catch (err) {
      showToast("error", "Error", err instanceof Error ? err.message : "Could not verify Farcaster identity.");
    }
  }, [wallet, refetch, showToast, ensureProofOrToast]);

  const handleRevoke = useCallback(async (platform: Platform) => {
    if (!wallet) return;
    const walletProof = await ensureProofOrToast();
    if (!walletProof) return;
    try {
      const res = await fetch("/api/proof", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, platform, walletProof }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to disconnect platform");
      await refetch();
      showToast("success", "Disconnected", `${platform} verification removed.`);
    } catch (err) {
      showToast("error", "Disconnect failed", err instanceof Error ? err.message : "Disconnect failed");
    }
  }, [wallet, refetch, showToast, ensureProofOrToast]);

  const handleUpdate = useCallback(async (platform: Platform) => {
    if (!wallet) return;
    const proof = await ensureProofOrToast();
    if (!proof) return;
    refetch();
    if (platform === "farcaster") {
      showToast("success", "Ready", "Click Connect Farcaster to re-verify.");
      return;
    }
    startOAuth(platform, wallet);
  }, [wallet, refetch, showToast, ensureProofOrToast, startOAuth]);

  const handleDisconnectAll = useCallback(async () => {
    if (!wallet) return;
    const walletProof = await ensureProofOrToast();
    if (!walletProof) return;
    try {
      const platforms: Platform[] = ["github", "discord", "farcaster"];
      const results = await Promise.all(
        platforms.map((p) =>
          fetch("/api/proof", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet, platform: p, walletProof }),
          }).then(async (res) => ({ ok: res.ok, data: await res.json() }))
        )
      );
      const failed = results.find((r) => !r.ok || !r.data?.success);
      if (failed) throw new Error(failed.data?.error || "Failed to disconnect one or more platforms");
      await refetch();
      showToast("success", "Disconnected", "All verifications removed.");
    } catch (err) {
      showToast("error", "Disconnect failed", err instanceof Error ? err.message : "Disconnect all failed");
    }
  }, [wallet, refetch, showToast, ensureProofOrToast]);

  // --- Compute mint target ---
  const mintIdx = useMemo(
    () => mintPriority(hasWalletProof, verifications),
    [hasWalletProof, verifications]
  );

  // --- Not connected ---
  if (!connected || !wallet) {
    return (
      <div className="verify-empty-state">
        <div className="verify-empty-card">
          <div className="verify-empty-icon">
            <Lock size={20} style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: 10 }}>
            Connect your wallet
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.65 }}>
            Rialink works with SVM wallets. Your private key never leaves your device.
          </p>
          <button onClick={() => setVisible(true)} className="btn-accent" style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 15, fontWeight: 500 }}>
            Connect wallet
          </button>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
            Rialo is SVM-compatible. Solana wallets work natively.
          </p>
        </div>
      </div>
    );
  }

  const avatarColor = generateAvatarColor(wallet);
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const verifierCardId = cardIdFromWallet(wallet);
  const verifierUrl = `${APP_URL}/verifier?cardId=${encodeURIComponent(verifierCardId)}`;
  const isComplete = verifiedCount === 3;
  const hasAnyConnected = verifications.some((v) => v.status === "verified");

  return (
    <>
      <div className="verify-workspace">
        <div className="verify-layout">

          {/* --- IDENTITY RAIL --- */}
          <aside className="verify-rail">
            {/* Avatar + wallet */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                className="verify-avatar"
                style={{ background: avatarColor, width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 auto 10px" }}
              >
                {wallet[0].toUpperCase()}
              </div>
              <AddressDisplay address={wallet} />
            </div>

            {/* Divider */}
            <div className="verify-divider" />

            {/* Identities */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="verify-label">Identities</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{verifiedCount} / 3</span>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="verify-progress-segment"
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i < verifiedCount ? "var(--accent)" : "#1A2030",
                      transition: "background 0.3s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="verify-divider" />

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a
                href={`/verifier?cardId=${encodeURIComponent(verifierCardId)}`}
                className="verify-ghost-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open verifier <ExternalLink size={12} />
              </a>
              <button onClick={() => copyLink(verifierUrl)} className="verify-ghost-btn">
                <Copy size={13} />
                {linkCopied ? "Copied!" : "Copy verifier link"}
              </button>
              {/* View RialCard: ghost unless COMPLETE (mintIdx === -1) */}
              <a
                href={`/certificate/${wallet}`}
                className={mintIdx === -1 ? "verify-btn-mint" : "verify-ghost-btn"}
                style={{ textDecoration: "none" }}
              >
                View RialCard
              </a>
              {/* Disconnect all: quiet text, only when something is connected */}
              {hasAnyConnected && (
                <button onClick={handleDisconnectAll} className="verify-disconnect-text">
                  <LogOut size={13} />
                  Disconnect all
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="verify-divider" />

            {/* Network */}
            <div>
              <p className="verify-label" style={{ marginBottom: 4 }}>Network</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                Rialo Devnet
              </p>
            </div>
          </aside>

          {/* --- MAIN COLUMN --- */}
          <main className="verify-main">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: "clamp(24px, 3vw, 28px)", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text-primary)", marginBottom: 4 }}>
                Your Verifications
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                Bind GitHub, Discord, and Farcaster to this wallet.
              </p>
            </div>

            {/* Sign challenge: only visible when unsigned (mintIdx === -2) */}
            {mintIdx === -2 && (
              <div className="verify-sign-slab">
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Sign a message to prove you own this wallet. This protects your identity from being claimed by others.
                </p>
                <button
                  onClick={() => ensureProofOrToast()}
                  disabled={isSigning}
                  className="verify-btn-mint"
                  style={{ marginTop: 10, height: 34, padding: "0 14px", fontSize: 13 }}
                >
                  {isSigning ? "Signing..." : "Sign to continue"}
                </button>
              </div>
            )}

            {/* Sign receipt: slim row when signed */}
            {mintIdx !== -2 && hasWalletProof && (
              <div className="verify-sign-receipt">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Wallet signed</span>
              </div>
            )}

            {/* Platform cards */}
            {isLoading ? (
              <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading verifications...</span>
              </div>
            ) : (
              <PlatformGrid
                verifications={verifications}
                wallet={wallet}
                mintIdx={mintIdx}
                onConnect={handleConnect}
                onRevoke={handleRevoke}
                onUpdate={handleUpdate}
                onFarcasterConnect={handleFarcasterConnect}
              />
            )}

            {/* Public Badge */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: 4 }}>
                Public Badge
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                Share your verifier link for checks. The badge is a quick visual summary.
              </p>
              <ProofBadge wallet={wallet} verifications={verifications} />
            </div>
          </main>
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
