import Link from "next/link";
import type { ProofRecord } from "@/lib/types";
import { resolveWalletFromCardId, getProofs, getIdentityRoot } from "@/lib/server/proof-storage";

export const dynamic = "force-dynamic";

function shortWallet(wallet: string): string {
  return wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "";
}

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default async function CardPage({ params }: { params: { cardId: string } }) {
  const cardId = String(params.cardId || "").trim().toUpperCase();
  const wallet = await resolveWalletFromCardId(cardId);

  if (!wallet) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "96px 16px", color: "var(--text-primary)" }}>
        <div style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ margin: 0 }}>RialCard not found</h1>
          <p style={{ color: "var(--text-secondary)" }}>Check the card ID and try again.</p>
        </div>
      </div>
    );
  }

  const proofs = (await getProofs(wallet)) as ProofRecord[];
  const identityRoot = (await getIdentityRoot(wallet)) || "-";
  const issueDate = proofs.length > 0 ? fmtDate(proofs[proofs.length - 1].verifiedAt) : "-";

  const has = new Set(proofs.map((p) => p.platform));
  const rows = [
    { label: "GitHub", ok: has.has("github") },
    { label: "Discord", ok: has.has("discord") },
    { label: "Farcaster", ok: has.has("farcaster") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "96px 16px", color: "var(--text-primary)" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 44 }}>RialCard</h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Public card lookup by Card ID.</p>

        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            border: "1px solid rgba(92,225,230,0.24)",
            background: "linear-gradient(145deg, #f7f1e3 0%, #efe5cf 100%)",
            padding: 16,
            color: "#111827",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 700 }}>RIALINK | RIALO</div>
              <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{proofs.length}/3</div>
              <div style={{ fontSize: 12, color: "#334155" }}>Verified socials</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12 }}>
              <div style={{ color: "#475569" }}>Card ID</div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f766e" }}>{cardId}</div>
              <div style={{ marginTop: 6, color: "#475569" }}>Issued {issueDate}</div>
            </div>
          </div>

          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)", background: "rgba(255,255,255,0.7)" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Wallet</div>
            <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{shortWallet(wallet)}</div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {rows.map((r) => (
              <div key={r.label} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)", background: "rgba(255,255,255,0.65)", display: "flex", justifyContent: "space-between" }}>
                <span>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.ok ? "#166534" : "#64748b" }}>{r.ok ? "OK" : "NONE"}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)", background: "rgba(255,255,255,0.65)" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Identity Root</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{identityRoot}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={`/verifier?cardId=${encodeURIComponent(cardId)}`} style={{ color: "#5ce1e6", textDecoration: "none" }}>
            Open verifier
          </Link>
          <Link href={`/certificate/${wallet}`} style={{ color: "#5ce1e6", textDecoration: "none" }}>
            Open certificate
          </Link>
        </div>
      </div>
    </div>
  );
}
