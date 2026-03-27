"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, RefreshCw, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";
import type { Platform, VerificationState } from "@/lib/types";

const FarcasterSignIn = dynamic(() => import("./FarcasterSignIn"), { ssr: false });

function GitHubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#7C3AED">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function FarcasterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#855DCD">
      <path d="M11.996 0C5.372 0 0 5.372 0 11.996c0 6.625 5.372 12 11.996 12C18.625 24 24 18.625 24 11.996 24 5.372 18.625 0 11.996 0zm5.24 17.08h-2.2v-4.702c0-.972-.385-1.46-1.154-1.46-.848 0-1.271.512-1.271 1.46v2.516h-2.19v-2.516c0-.948-.424-1.46-1.271-1.46-.77 0-1.155.488-1.155 1.46V17.08h-2.2V9.723h2.2v.95c.476-.73 1.19-1.097 2.14-1.097.963 0 1.72.4 2.27 1.2.564-.8 1.38-1.2 2.44-1.2 1.8 0 2.39 1.25 2.39 3.13V17.08zM7.42 8.33c-.73 0-1.32-.59-1.32-1.32 0-.73.59-1.32 1.32-1.32.73 0 1.32.59 1.32 1.32 0 .73-.59 1.32-1.32 1.32zm9.15 0c-.73 0-1.32-.59-1.32-1.32 0-.73.59-1.32 1.32-1.32.73 0 1.32.59 1.32 1.32 0 .73-.59 1.32-1.32 1.32z" />
    </svg>
  );
}

const PLATFORM_ICONS = { github: GitHubIcon, discord: DiscordIcon, farcaster: FarcasterIcon };
const PLATFORM_COLORS: Record<Platform, string> = { github: "var(--github)", discord: "var(--discord)", farcaster: "var(--farcaster)" };
const PLATFORM_TAG: Record<Platform, string> = { github: "Developer", discord: "Community", farcaster: "Web3" };
const PLATFORM_TAG_BG: Record<Platform, string> = { github: "rgba(124,58,237,0.1)", discord: "rgba(88,101,242,0.1)", farcaster: "rgba(133,93,205,0.1)" };
const PLATFORM_DESCRIPTION: Record<Platform, string> = {
  github: "Verify your developer identity. We confirm your username and public repository count.",
  discord: "Verify your community identity. Confirm your username and account legitimacy.",
  farcaster: "Native Web3 identity. Sign in with your wallet via Farcaster. No OAuth keys needed.",
};
const PLATFORM_NOTE: Record<Platform, string> = {
  github: "OAuth 2.0  read-only access  no passwords stored",
  discord: "OAuth 2.0  read-only access  no passwords stored",
  farcaster: "Sign In With Farcaster  wallet-based  no API keys",
};

interface VerificationCardProps {
  state: VerificationState;
  wallet: string;
  readOnly?: boolean;
  onRevoke?: (platform: Platform) => Promise<void>;
  onUpdate?: (platform: Platform) => void;
  onConnect?: (platform: Platform) => void;
  onFarcasterConnect?: (data: { fid: number; username: string; custody: string; message: string; signature: string; nonce: string; domain: string; pfpUrl?: string }) => void;
}

export function VerificationCard({ state, wallet, readOnly = false, onRevoke, onUpdate, onConnect, onFarcasterConnect }: VerificationCardProps) {
  const { platform, status, proof, error } = state;
  const Icon = PLATFORM_ICONS[platform];
  const color = PLATFORM_COLORS[platform];
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const handleConnect = useCallback(() => {
    if (onConnect) {
      onConnect(platform);
      return;
    }
    if (platform === "github") {
      localStorage.setItem("verifyme_pending_wallet", wallet);
      window.location.href = `/api/github?wallet=${wallet}`;
    } else if (platform === "discord") {
      localStorage.setItem("verifyme_pending_wallet", wallet);
      window.location.href = `/api/discord?wallet=${wallet}`;
    }
  }, [platform, wallet, onConnect]);

  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    try { await onRevoke?.(platform); }
    finally { setRevoking(false); setShowRevokeModal(false); }
  }, [onRevoke, platform]);

  const borderStyle = status === "error" ? "1px solid rgba(248,113,113,0.2)" : "1px solid var(--border-subtle)";

  return (
    <div>
      <div style={{ background: "var(--bg-surface)", border: borderStyle, borderRadius: "14px", padding: "20px", marginBottom: "12px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Icon size={20} />
            <span style={{ fontSize: "16px", fontWeight: 500, color: "var(--text-primary)" }}>
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 7px", borderRadius: "6px", background: PLATFORM_TAG_BG[platform], color }}>
              {PLATFORM_TAG[platform]}
            </span>
          </div>
          <Badge variant={status === "verified" ? "verified" : status === "pending" ? "pending" : status === "error" ? "error" : "unverified"} />
        </div>

        {status === "unverified" && !readOnly && (
          <div style={{ marginTop: "16px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.6 }}>
              {PLATFORM_DESCRIPTION[platform]}
            </p>
            {platform === "farcaster" ? (
              <FarcasterSignIn onSuccess={(data) => onFarcasterConnect?.(data)} onError={() => {}} />
            ) : (
              <button onClick={handleConnect} className="btn-primary" style={{ width: "100%", height: "38px", borderRadius: "10px", background: "var(--accent)", color: "var(--text-inverse)", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 500, fontFamily: "inherit" }}>
                Connect {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            )}
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
              {PLATFORM_NOTE[platform]}
            </p>
          </div>
        )}

        {status === "unverified" && readOnly && (
          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Not verified yet</p>
          </div>
        )}

        {status === "pending" && (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Spinner size={14} color={color} />
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Connecting...</span>
          </div>
        )}

        {status === "verified" && proof && (
          <div style={{ marginTop: "12px" }}>

            {/* Profile row  pfp + username + meta */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
              {proof.pfpUrl ? (
                <img src={proof.pfpUrl} alt="avatar" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-default)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "#fff", flexShrink: 0, opacity: 0.8 }}>
                  {proof.maskedUsername?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", fontFamily: "monospace", marginBottom: "2px" }}>
                  {proof.maskedUsername}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {platform === "github" && proof.repoCount !== undefined && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{proof.repoCount} public repos</span>
                  )}
                  {platform === "farcaster" && proof.followerCount !== undefined && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{proof.followerCount} followers</span>
                  )}
                  {platform === "discord" && proof.accountCreatedAt && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Account since {new Date(proof.accountCreatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Verified {formatDate(proof.verifiedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                This account is verified and ready for eligibility checks in DAOs, airdrops, and communities.
              </p>
            </div>

            {/* Actions */}
            {!readOnly && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
                {proof.txSignature && !String(proof.txSignature).startsWith("offchain:") ? (
                  <a href={`${EXPLORER_URL}/tx/${proof.txSignature}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--accent-text)", display: "flex", alignItems: "center", gap: "4px" }}>
                    View on Explorer <ExternalLink size={11} />
                  </a>
                ) : (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Off-chain (pending Rialo)</span>
                )}
                <button
                  onClick={() => onUpdate?.(platform)}
                  style={{ fontSize: "12px", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <RefreshCw size={11} /> Refresh
                </button>
                <button onClick={() => setShowRevokeModal(true)} className="revoke-btn" style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Unlink size={11} /> Disconnect
                </button>
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "14px", color: "var(--error)", marginBottom: "4px" }}>Verification failed</p>
            {error && <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>{error}</p>}
            {!readOnly && (
              <button onClick={handleConnect} className="btn-ghost" style={{ width: "100%", height: "38px", borderRadius: "10px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-default)", cursor: "pointer", fontSize: "14px", fontWeight: 500, fontFamily: "inherit" }}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <Modal open={showRevokeModal} onClose={() => setShowRevokeModal(false)} title="Disconnect verification?"
        footer={
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowRevokeModal(false)}>Cancel</Button>
            <Button variant="danger-ghost" loading={revoking} onClick={handleRevoke}>Disconnect</Button>
          </div>
        }
      >
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
          This will remove your {platform.charAt(0).toUpperCase() + platform.slice(1)} verification. You can reconnect at any time.
        </p>
      </Modal>
    </div>
  );
}



