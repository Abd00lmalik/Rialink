"use client";
import { VerificationCard } from "./VerificationCard";
import type { Platform, VerificationState } from "@/lib/types";

interface PlatformGridProps {
  verifications: VerificationState[];
  wallet: string;
  readOnly?: boolean;
  onRevoke?: (platform: Platform) => Promise<void>;
  onUpdate?: (platform: Platform) => void;
  onConnect?: (platform: Platform) => void;
  onFarcasterConnect?: (data: { fid: number; username: string; custody: string; message: string; signature: string; nonce: string; domain: string; pfpUrl?: string }) => void;
}

export function PlatformGrid({ verifications, wallet, readOnly, onRevoke, onUpdate, onConnect, onFarcasterConnect }: PlatformGridProps) {
  return (
    <div>
      {verifications.map((v) => (
        <VerificationCard
          key={v.platform}
          state={v}
          wallet={wallet}
          readOnly={readOnly}
          onRevoke={onRevoke}
          onUpdate={onUpdate}
          onConnect={onConnect}
          onFarcasterConnect={onFarcasterConnect}
        />
      ))}
    </div>
  );
}
