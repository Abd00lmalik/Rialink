import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import WalletProvider from "@/components/wallet/WalletProvider";
import { WalletModal } from "@/components/wallet/WalletModal";
import { Providers } from "@/components/wallet/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Rialink - Decentralized Identity on Rialo",
  description: "Link your GitHub, Discord, and Farcaster accounts to your wallet. Permanent, cryptographic proof on the Rialo blockchain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <WalletProvider>
            <Navbar />
            <WalletModal />
            <main style={{ minHeight: "100vh" }}>{children}</main>
            <Footer />
          </WalletProvider>
        </Providers>
      </body>
    </html>
  );
}

