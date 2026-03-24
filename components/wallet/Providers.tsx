"use client";
import { AuthKitProvider } from "@farcaster/auth-kit";

const farcasterConfig = {
  relay: "https://relay.farcaster.xyz",
  domain: typeof window !== "undefined"
    ? window.location.host
    : "verifyme-two.vercel.app",
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthKitProvider config={farcasterConfig}>
      {children}
    </AuthKitProvider>
  );
}
