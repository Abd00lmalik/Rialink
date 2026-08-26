"use client";
import { VerificationCard } from "./VerificationCard";
import type { Platform, VerificationState } from "@/lib/types";

interface PlatformGridProps {
  verifications: VerificationState[];
  wallet: string;
  readOnly?: boolean;
  mintIdx?: number;
  onRevoke?: (platform: Platform) => Promise<void>;
  onUpdate?: (platform: Platform) => void;
  onConnect?: (platform: Platform) => void;
  onFarcasterConnect?: (data: {
    fid: number; username: string; custody: string; message: string;
    signature: string; nonce: string; domain: string; pfpUrl?: string;
  }) => Promise<void> | void;
}

export function PlatformGrid({
  verifications, wallet, readOnly, mintIdx = -3, onRevoke, onUpdate, onConnect, onFarcasterConnect,
}: PlatformGridProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {verifications.map((v) => (
        <VerificationCard
          key={v.platform}
          state={v}
          wallet={wallet}
          readOnly={readOnly}
          mintIdx={mintIdx}
          onRevoke={onRevoke}
          onUpdate={onUpdate}
          onConnect={onConnect}
          onFarcasterConnect={onFarcasterConnect}
        />
      ))}
    </div>
  );
}
