"use client";
import { useState } from "react";
import { SignInButton } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";

interface Props {
  onSuccess: (data: { fid: number; username: string; custody: string; signature: string }) => void;
  onError?: (err: unknown) => void;
}

export default function FarcasterSignIn({ onSuccess, onError }: Props) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "38px", fontSize: "14px", color: "var(--success)" }}>
         Farcaster connected  saving...
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <SignInButton
        onSuccess={({ fid, username, custody, signature }) => {
          setDone(true);
          onSuccess({ fid: fid ?? 0, username: username ?? "", custody: custody ?? "", signature: signature ?? "" });
        }}
        onError={onError}
      />
    </div>
  );
}

