import { ImageResponse } from "next/og";
import { Redis } from "@upstash/redis";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const redis = Redis.fromEnv();

function shortWallet(wallet: string) {
  return wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "";
}

function monthsSince(iso?: string) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function score(proofs: any[]) {
  const github = proofs.find((p) => p.platform === "github");
  const discord = proofs.find((p) => p.platform === "discord");
  const farcaster = proofs.find((p) => p.platform === "farcaster");

  const repos = Number(github?.repoCount || 0);
  const commits = Number(github?.commitCount || 0);
  const followers = Number(farcaster?.followerCount || 0);
  const servers = Number(discord?.serverCount || 0);
  const discordAge = monthsSince(discord?.accountCreatedAt);

  const reposPts = clamp(Math.round((Math.min(repos, 120) / 120) * 25), 0, 25);
  const commitsPts = clamp(Math.round((Math.min(commits, 800) / 800) * 20), 0, 20);
  const agePts = clamp(Math.round((Math.min(discordAge, 72) / 72) * 20), 0, 20);
  const serversPts = clamp(Math.round((Math.min(servers, 50) / 50) * 10), 0, 10);
  const followersPts = clamp(Math.round((Math.min(followers, 5000) / 5000) * 20), 0, 20);
  const completionPts = clamp(Math.round((proofs.length / 3) * 5), 0, 5);

  return reposPts + commitsPts + agePts + serversPts + followersPts + completionPts;
}

export default async function Image({ params }: { params: { wallet: string } }) {
  const wallet = params.wallet;
  let proofs: any[] = [];

  try {
    const rows = await redis.lrange<any>(`proofs:${wallet}`, 0, -1);
    proofs = Array.isArray(rows) ? rows : [];
  } catch {}

  const s = score(proofs);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(1200px 400px at 20% -10%, rgba(92,225,230,0.2), transparent 60%), radial-gradient(900px 400px at 90% 110%, rgba(124,58,237,0.25), transparent 65%), #040815",
          color: "#e6edff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "760px",
            borderRadius: "26px",
            border: "1px solid rgba(242,225,190,0.45)",
            background: "linear-gradient(155deg, #fff9ec 0%, #f8f0df 52%, #f3e7d2 100%)",
            color: "#1e293b",
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "18px", color: "#0f766e" }}>RIALINK | RIALO</div>
              <div style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1 }}>{s}/100</div>
              <div style={{ fontSize: "24px" }}>VM Card Score</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: "18px", color: "#475569" }}>Wallet</div>
              <div style={{ fontSize: "28px", fontFamily: "monospace", color: "#0f766e", fontWeight: 700 }}>
                {shortWallet(wallet)}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
