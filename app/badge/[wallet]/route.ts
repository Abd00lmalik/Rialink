import { NextResponse } from "next/server";
import type { ProofRecord } from "@/lib/types";
import { getProofs } from "@/lib/server/proof-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortWallet(wallet: string): string {
  if (!wallet) return "";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export async function GET(_req: Request, context: { params: { wallet: string } }) {
  const wallet = context.params.wallet;
  const proofs = (await getProofs(wallet)) as ProofRecord[];
  const map = new Set(proofs.map((p) => p.platform));

  const rows = [
    { key: "github", label: "GitHub" },
    { key: "discord", label: "Discord" },
    { key: "farcaster", label: "Farcaster" },
  ]
    .map((item) => {
      const ok = map.has(item.key as "github" | "discord" | "farcaster");
      return `<div class="row"><span>${item.label}</span><span>${ok ? "OK" : "NONE"}</span></div>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Rialink Badge</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 340px;
    height: 120px;
    font-family: Inter, Arial, sans-serif;
    background: #0b1020;
    color: #dbeafe;
  }
  .card {
    width: 340px;
    height: 120px;
    padding: 10px 12px;
    border: 1px solid rgba(92,225,230,0.28);
    border-radius: 12px;
    background: linear-gradient(145deg, #0a1022 0%, #0f1a31 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  .tag {
    color: #5ce1e6;
    font-weight: 700;
  }
  .wallet {
    color: #93c5fd;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
  }
  .row {
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 4px 6px;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
  }
  .foot {
    font-size: 11px;
    color: #34d399;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="top">
      <span class="tag">Rialink</span>
      <span class="wallet">${escapeHtml(shortWallet(wallet))}</span>
    </div>
    <div class="grid">${rows}</div>
    <div class="foot">Cryptographically verified</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "frame-ancestors *",
    },
  });
}
