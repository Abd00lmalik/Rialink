import Link from "next/link";
import type { ProofRecord } from "@/lib/types";
import { getProofs, resolveWalletFromCardId } from "@/lib/server/proof-storage";

function prettyPlatform(platform: ProofRecord["platform"]): string {
  if (platform === "github") return "GitHub";
  if (platform === "discord") return "Discord";
  return "Farcaster";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function StoryPage({ params }: { params: { cardId: string } }) {
  const cardId = String(params.cardId || "").trim().toUpperCase();
  const wallet = await resolveWalletFromCardId(cardId);

  if (!wallet) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          padding: "96px 16px",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ margin: 0 }}>Proof story not found</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            Check the shared link and try again.
          </p>
        </div>
      </div>
    );
  }

  const proofs = (await getProofs(wallet))
    .filter((proof) => proof.verified)
    .sort((a, b) => Date.parse(a.verifiedAt) - Date.parse(b.verifiedAt));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        padding: "96px 16px 64px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "8px",
          }}
        >
          Rialink Proof Story
        </p>
        <h1 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.02em" }}>
          Verification journey for {cardId}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
          This page tells the story of when each social account was linked to this wallet.
        </p>

        <div
          style={{
            marginTop: "14px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            background: "var(--bg-surface)",
            padding: "12px",
            fontFamily: "monospace",
            fontSize: "12px",
            color: "var(--text-secondary)",
            wordBreak: "break-all",
          }}
        >
          Wallet: {wallet}
        </div>

        <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
          {proofs.length === 0 ? (
            <div
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                background: "var(--bg-surface)",
                padding: "16px",
              }}
            >
              <p style={{ color: "var(--text-secondary)" }}>
                No verified events are currently available for this wallet.
              </p>
            </div>
          ) : (
            proofs.map((proof, index) => (
              <article
                key={`${proof.platform}-${proof.userId}-${proof.verifiedAt}-${index}`}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  background: "var(--bg-surface)",
                  padding: "14px",
                }}
              >
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Step {index + 1}
                </p>
                <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                  {prettyPlatform(proof.platform)} linked as{" "}
                  {proof.fullName || `@${proof.username}`}
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                  Recorded on {formatDate(proof.verifiedAt)}
                </p>
              </article>
            ))
          )}
        </div>

        <div style={{ marginTop: "14px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link
            href={`/verifier?cardId=${encodeURIComponent(cardId)}`}
            style={{ color: "#5ce1e6", textDecoration: "none" }}
          >
            Open verifier
          </Link>
          <Link
            href={`/certificate/${wallet}`}
            style={{ color: "#5ce1e6", textDecoration: "none" }}
          >
            Open certificate
          </Link>
        </div>
      </div>
    </div>
  );
}
