"use client";
import { useState } from "react";
import { SignInButton } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";

interface Props {
  onSuccess: (data: {
    fid: number;
    username: string;
    custody: string;
    message: string;
    signature: string;
    nonce: string;
    domain: string;
    pfpUrl?: string;
  }) => Promise<void> | void;
  onError?: (err: unknown) => void;
}

export default function FarcasterSignIn({ onSuccess, onError }: Props) {
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (done) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "38px", fontSize: "14px", color: "var(--success)" }}>
        Farcaster connected  saving...
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {saveError && (
        <div
          style={{
            marginBottom: "10px",
            border: "1px solid rgba(248,113,113,0.35)",
            borderRadius: "10px",
            background: "var(--error-muted)",
            padding: "10px",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", color: "var(--error)" }}>{saveError}</p>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            style={{
              marginTop: "8px",
              height: "30px",
              padding: "0 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      <SignInButton
        onSuccess={async (data: any) => {
          if (!data || data.state !== "completed") return;
          const signatureParams = data.signatureParams || {};
          setSaveError(null);
          setDone(true);
          try {
            await onSuccess({
              fid: data.fid ?? 0,
              username: data.username ?? "",
              custody: data.custody ?? "",
              message: data.message ?? "",
              signature: data.signature ?? "",
              nonce: data.nonce ?? "",
              domain: signatureParams.domain ?? "",
              pfpUrl: data.pfpUrl ?? "",
            });
          } catch (error) {
            setDone(false);
            setSaveError("Saving failed. Please retry the Farcaster connection.");
            onError?.(error);
          }
        }}
        onError={(error) => {
          setDone(false);
          onError?.(error);
        }}
      />
    </div>
  );
}

