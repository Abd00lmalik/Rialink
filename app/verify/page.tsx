"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Lock, ExternalLink, Copy, LogOut } from "lucide-react";
import { useVerifications } from "@/hooks/useVerifications";
import { useWalletProof, getStoredWalletProof } from "@/hooks/useWalletProof";
import { useToast } from "@/hooks/useToast";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { PlatformGrid } from "@/components/verification/PlatformGrid";
import { ProofBadge } from "@/components/verification/ProofBadge";
import { ToastContainer } from "@/components/ui/Toast";
import { Divider } from "@/components/ui/Divider";
import { AddressDisplay } from "@/components/ui/AddressDisplay";
import { generateAvatarColor } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";
import type { Platform } from "@/lib/types";

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
    if (!wallet) {
      setHasWalletProof(false);
      return;
    }
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

  // Handle OAuth callback params (GitHub + Discord redirect back here with server-issued session token)
  useEffect(() => {
    const success = searchParams.get("success");
    const platform = searchParams.get("platform") as Platform | null;
    const verificationToken = searchParams.get("session");
    const errorParam = searchParams.get("error");

    // Resolve wallet: prefer connected wallet, fall back to localStorage
    const resolvedWallet = wallet || localStorage.getItem("rialink_pending_wallet");

    if (errorParam && platform) {
      const msg = searchParams.get("message") || "Verification failed";
      showToast("error", `${platform} error`, msg);
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
        body: JSON.stringify({
          wallet: resolvedWallet,
          platform,
          verificationToken,
          walletProof,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Could not save proof");
          }
          localStorage.removeItem("rialink_pending_wallet");
          await refetch();
          showToast(
            "success",
            `${platform.charAt(0).toUpperCase() + platform.slice(1)} Verified!`,
            "Identity linked and cryptographically bound to your wallet."
          );
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Verification failed";
          showToast("error", "Verification failed", msg);
        })
        .finally(() => {
          // Clean URL so refresh does not replay callback handling.
          router.replace("/verify");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const startOAuth = useCallback(
    (platform: Platform, addr: string) => {
      localStorage.setItem("rialink_pending_wallet", addr);
      if (platform === "github") {
        window.location.href = `/api/github?wallet=${addr}`;
      } else if (platform === "discord") {
        window.location.href = `/api/discord?wallet=${addr}`;
      }
    },
    []
  );

  // Connect GitHub/Discord
  const handleConnect = useCallback(
    async (platform: Platform) => {
      if (!wallet) return;
      const proof = await ensureProofOrToast();
      if (!proof) return;
      startOAuth(platform, wallet);
    },
    [wallet, ensureProofOrToast, startOAuth]
  );

  // Farcaster (no OAuth redirect handled inline)
  const handleFarcasterConnect = useCallback(
    async (data: {
      fid: number;
      username: string;
      custody: string;
      message: string;
      signature: string;
      nonce: string;
      domain: string;
      pfpUrl?: string;
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
          body: JSON.stringify({
            wallet,
            platform: "farcaster",
            verificationToken: String(verifyData.verificationToken || ""),
            walletProof,
          }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok || !saveData?.success) {
          throw new Error(saveData?.error || "Could not save Farcaster proof");
        }

        await refetch();
        showToast("success", "Farcaster Verified!", "Identity linked and cryptographically bound.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not verify Farcaster identity.";
        showToast("error", "Error", msg);
      }
    },
    [wallet, refetch, showToast, ensureProofOrToast]
  );

  // Disconnect single platform
  const handleRevoke = useCallback(
    async (platform: Platform) => {
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
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to disconnect platform");
        }
        await refetch();
        showToast("success", "Disconnected", `${platform} verification removed.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Disconnect failed";
        showToast("error", "Disconnect failed", msg);
      }
    },
    [wallet, refetch, showToast, ensureProofOrToast]
  );

  // Update (re-verify) a platform
  const handleUpdate = useCallback(
    async (platform: Platform) => {
      if (!wallet) return;
      const proof = await ensureProofOrToast();
      if (!proof) return;
      refetch();
      if (platform === "farcaster") {
        showToast("success", "Ready", "Click Connect Farcaster to re-verify.");
        return;
      }
      startOAuth(platform, wallet);
    },
    [wallet, refetch, showToast, ensureProofOrToast, startOAuth]
  );

  // Disconnect all
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
      if (failed) {
        throw new Error(failed.data?.error || "Failed to disconnect one or more platforms");
      }
      await refetch();
      showToast("success", "Disconnected", "All verifications removed.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Disconnect all failed";
      showToast("error", "Disconnect failed", msg);
    }
  }, [wallet, refetch, showToast, ensureProofOrToast]);

  // Not connected
  if (!connected || !wallet) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 40px" }}>
        <div style={{ maxWidth: "400px", width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "40px", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={20} style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "10px" }}>Connect your wallet</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.65 }}>
            Rialink works with SVM wallets. Your private key never leaves your device.
          </p>
          <button onClick={() => setVisible(true)} style={{ width: "100%", height: "44px", borderRadius: "10px", background: "var(--accent)", color: "var(--text-inverse)", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 500, fontFamily: "inherit" }} className="btn-primary">
            Connect wallet
          </button>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "14px" }}>Rialo is SVM-compatible Solana wallets work natively</p>
        </div>
      </div>
    );
  }

  const avatarColor = generateAvatarColor(wallet);
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const verifierUrl = `${APP_URL}/verifier?wallet=${encodeURIComponent(wallet)}`;

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
              <a href={`/verifier?wallet=${encodeURIComponent(wallet)}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }} className="btn-ghost">
                Open verifier <ExternalLink size={12} />
              </a>
              <button onClick={() => copyLink(verifierUrl)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)", cursor: "pointer", fontFamily: "inherit" }} className="btn-ghost">
                <Copy size={13} />
                {linkCopied ? "Copied!" : "Copy verifier link"}
              </button>
              {verifiedCount > 0 && (
                <a href={`/certificate/${wallet}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "var(--text-inverse)", border: "none", textDecoration: "none" }} className="btn-primary">
                  View VM Card
                </a>
              )}
              {verifiedCount > 0 && (
                <button onClick={handleDisconnectAll} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "transparent", color: "var(--error, #f87171)", border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                  <LogOut size={13} />
                  Disconnect all
                </button>
              )}
            </div>
            <Divider my="16px" />
            <div>
              <p style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "4px" }}>Network</p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ color: "var(--success)", fontSize: "10px" }}> </span>
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

            {!hasWalletProof && (
              <div style={{ marginBottom: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "14px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                  Step 1: Sign a message to prove you own this wallet. This protects your identity from being claimed by others.
                </p>
                <button
                  onClick={() => ensureProofOrToast()}
                  disabled={isSigning}
                  style={{ marginTop: "10px", height: "34px", borderRadius: "8px", background: "var(--accent)", color: "var(--text-inverse)", border: "none", cursor: "pointer", padding: "0 14px", fontSize: "13px", fontWeight: 500 }}
                >
                  {isSigning ? "Signing..." : "Sign to continue"}
                </button>
              </div>
            )}

            {isLoading ? (
              <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading verifications...</span>
              </div>
            ) : (
              <PlatformGrid
                verifications={verifications}
                wallet={wallet}
                onConnect={handleConnect}
                onRevoke={handleRevoke}
                onUpdate={handleUpdate}
                onFarcasterConnect={handleFarcasterConnect}
              />
            )}

            {verifiedCount > 0 && (
              <div style={{ marginTop: "24px", background: "linear-gradient(135deg, #0D1117 0%, #0E1520 100%)", border: "1px solid rgba(92,225,230,0.25)", borderRadius: "14px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    {verifiedCount === 3 ? " Fully Verified Builder" : `${verifiedCount} of 3 platforms verified`}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Share your VM Card with the world</p>
                </div>
                <a href={`/certificate/${wallet}`} style={{ flexShrink: 0, height: "38px", padding: "0 16px", borderRadius: "10px", background: "var(--accent)", color: "var(--text-inverse)", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
                  View VM Card
                </a>
              </div>
            )}
            <div style={{ marginTop: "32px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: "4px" }}>Public Badge</h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>Share your verifier link for checks. The badge is a quick visual summary.</p>
              <ProofBadge wallet={wallet} verifications={verifications} />
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

