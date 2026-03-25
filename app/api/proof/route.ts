import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { ProofRecord } from "@/lib/types";

const redis = Redis.fromEnv();

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ proofs: [] });
  try {
    const proofs = await redis.lrange<ProofRecord>(`proofs:${wallet}`, 0, -1);
    return NextResponse.json({ proofs: proofs || [] });
  } catch {
    return NextResponse.json({ proofs: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      wallet,
      platform,
      proofHash,
      usernameHash,
      maskedUsername,
      repoCount,
      followerCount,
      pfpUrl,
      accountCreatedAt
    } = body;

    if (!wallet || !platform || !proofHash) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const proof: ProofRecord = {
      wallet,
      platform,
      proofHash,
      usernameHash: usernameHash || "",
      maskedUsername: maskedUsername || "",
      verifiedAt: new Date().toISOString(),
      ...(repoCount !== undefined && { repoCount: Number(repoCount) }),
      ...(followerCount !== undefined && { followerCount: Number(followerCount) }),
      ...(pfpUrl ? { pfpUrl: String(pfpUrl) } : {}),
      ...(accountCreatedAt ? { accountCreatedAt: String(accountCreatedAt) } : {})
    };

    const key = `proofs:${wallet}`;
    const existing = await redis.lrange<ProofRecord>(key, 0, -1);
    const filtered = (existing || []).filter((p: ProofRecord) => p.platform !== platform);

    await redis.del(key);
    if (filtered.length > 0) await redis.rpush(key, ...filtered);
    await redis.rpush(key, proof);

    return NextResponse.json({ success: true, proof });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { wallet, platform } = await req.json();
    if (!wallet || !platform) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const key = `proofs:${wallet}`;
    const existing = await redis.lrange<ProofRecord>(key, 0, -1);
    const filtered = (existing || []).filter((p: ProofRecord) => p.platform !== platform);

    await redis.del(key);
    if (filtered.length > 0) await redis.rpush(key, ...filtered);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
