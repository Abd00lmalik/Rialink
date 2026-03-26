import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { MOCK_WALLET } from "@/lib/mock-data";

const redis = Redis.fromEnv();
const KEY_PREFIX = "proofs:";

export async function GET() {
  try {
    const keys = (await redis.keys(`${KEY_PREFIX}*`)) as string[];
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ wallets: 0, proofs: 0, platforms: 3 });
    }

    const rows = await Promise.all(
      keys.map(async (key) => {
        const wallet = key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key;
        if (wallet === MOCK_WALLET) return { count: 0 };
        const raw = await redis.llen(key);
        const count = typeof raw === "number" ? raw : Number(raw || 0);
        return { count: Number.isFinite(count) ? count : 0 };
      })
    );

    let wallets = 0;
    let proofs = 0;
    for (const row of rows) {
      if (row.count > 0) {
        wallets += 1;
        proofs += row.count;
      }
    }

    return NextResponse.json({ wallets, proofs, platforms: 3 });
  } catch {
    return NextResponse.json({ wallets: 0, proofs: 0, platforms: 3 });
  }
}
