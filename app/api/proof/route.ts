import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Platform, ProofRecord } from "@/lib/types";
import {
  saveProof,
  getProofs,
  getIdentityRoot,
  deleteProof,
  ProofConflictError,
} from "@/lib/server/proof-storage";
import { verifyWalletProof } from "@/lib/server/wallet-proof";
import { cardIdFromWallet } from "@/lib/card-id";
import { computeProofHash } from "@/lib/proof-hash";
import { createBindingProof } from "@/lib/server/binding-proof";
import { signProof } from "@/lib/server/proof-signing";
import { consumeVerifiedSocialSession } from "@/lib/server/verification-session";
import { toPublicProof } from "@/lib/server/public-proof";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { isValidWalletAddress } from "@/lib/server/wallet";

export const runtime = "nodejs";

const PLATFORMS = new Set<Platform>(["github", "discord", "farcaster"]);

function placeholderTxSignature(args: {
  wallet: string;
  platform: Platform;
  proofHash: string;
  verifiedAt: string;
}) {
  const digest = createHash("sha256")
    .update(`${args.wallet}|${args.platform}|${args.proofHash}|${args.verifiedAt}`)
    .digest("hex")
    .slice(0, 32);
  return `offchain:${digest}`;
}

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = await checkRateLimit({
    key: `proof-read:${ip}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
      }
    );
  }

  const wallet = String(req.nextUrl.searchParams.get("wallet") || "").trim();
  if (!wallet) return NextResponse.json({ proofs: [] });
  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const proofs = await getProofs(wallet);
    const identityRoot = await getIdentityRoot(wallet);
    const cardId = cardIdFromWallet(wallet);
    return NextResponse.json({
      proofs: proofs.map((proof) => toPublicProof(proof, { includeProofHash: true })),
      identityRoot,
      cardId,
    });
  } catch (error) {
    console.error("GET /api/proof failed", { wallet, error });
    return NextResponse.json(
      { error: "Could not load proofs for this wallet" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = String(body.wallet || "").trim();
    const platform = String(body.platform || "").trim() as Platform;
    const verificationToken = String(body.verificationToken || "").trim();
    const walletProof = body.walletProof;

    if (!wallet || !PLATFORMS.has(platform) || !verificationToken) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid fields" },
        { status: 400 }
      );
    }
    if (!isValidWalletAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const ip = getRequestIp(req);
    const rate = await checkRateLimit({
      key: `proof-write:${ip}:${wallet}`,
      limit: 12,
      windowSeconds: 60,
    });
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, error: "Too many proof requests. Please retry shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
        }
      );
    }

    const walletCheck = await verifyWalletProof(wallet, walletProof);
    if (!walletCheck.ok) {
      return NextResponse.json(
        { success: false, error: walletCheck.error },
        { status: 401 }
      );
    }

    // Critical trust boundary:
    // we only accept social identity from a server-issued verification session token.
    // This blocks users from forging usernames/user IDs from the frontend payload.
    const verifiedSession = await consumeVerifiedSocialSession({
      token: verificationToken,
      wallet,
      platform,
    });

    if (!verifiedSession.ok) {
      const message =
        verifiedSession.error === "expired_token"
          ? "Verification token expired. Reconnect platform."
          : verifiedSession.error === "wallet_mismatch"
          ? "Verification token is bound to a different wallet."
          : verifiedSession.error === "platform_mismatch"
          ? "Verification token platform mismatch."
          : "Invalid verification token.";
      return NextResponse.json(
        {
          success: false,
          error: verifiedSession.error,
          message,
        },
        { status: 401 }
      );
    }
    const socialSession = verifiedSession.session;

    const verifiedAt = new Date().toISOString();
    const issuedAt = Date.now();
    const nonce = randomUUID();
    const proofHash = computeProofHash({
      wallet,
      platform,
      platformUserId: socialSession.userId,
      nonce,
      version: "v2",
    });
    const signature = signProof(proofHash);

    const bindingProof = createBindingProof({
      wallet,
      platform,
      userId: socialSession.userId,
      username: socialSession.username,
      proofHash,
      nonce,
      issuedAt,
      version: "v2",
      signature,
      proofMethod: socialSession.proofMethod,
      socialSessionId: socialSession.id,
      verifiedAt,
      walletProof,
    });

    const proof: ProofRecord = {
      wallet,
      platform,
      userId: socialSession.userId,
      username: socialSession.username,
      ...(socialSession.fullName ? { fullName: socialSession.fullName } : {}),
      verified: true,
      verifiedAt,
      nonce,
      issuedAt,
      signature,
      version: "v2",
      proofMethod: socialSession.proofMethod,
      proofHash,
      bindingProof,
      txSignature: placeholderTxSignature({ wallet, platform, proofHash, verifiedAt }),
      ...(socialSession.repoCount !== undefined
        ? { repoCount: socialSession.repoCount }
        : {}),
      ...(socialSession.commitCount !== undefined
        ? { commitCount: socialSession.commitCount }
        : {}),
      ...(socialSession.followerCount !== undefined
        ? { followerCount: socialSession.followerCount }
        : {}),
      ...(socialSession.serverCount !== undefined
        ? { serverCount: socialSession.serverCount }
        : {}),
      ...(socialSession.pfpUrl ? { pfpUrl: socialSession.pfpUrl } : {}),
      ...(socialSession.accountCreatedAt
        ? { accountCreatedAt: socialSession.accountCreatedAt }
        : {}),
    };

    const saved = await saveProof(wallet, proof);
    return NextResponse.json({
      success: true,
      proof: toPublicProof(saved.proof, { includeProofHash: true }),
      cardId: saved.cardId,
      identityRoot: saved.identityRoot,
    });
  } catch (err) {
    if (err instanceof ProofConflictError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = String(body.wallet || "").trim();
    const platform = String(body.platform || "").trim() as Platform;
    const walletProof = body.walletProof;

    if (!wallet || !PLATFORMS.has(platform)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid fields" },
        { status: 400 }
      );
    }
    if (!isValidWalletAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const ip = getRequestIp(req);
    const rate = await checkRateLimit({
      key: `proof-delete:${ip}:${wallet}`,
      limit: 12,
      windowSeconds: 60,
    });
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, error: "Too many proof requests. Please retry shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
        }
      );
    }

    const verify = await verifyWalletProof(wallet, walletProof);
    if (!verify.ok) {
      return NextResponse.json(
        { success: false, error: verify.error },
        { status: 401 }
      );
    }

    const result = await deleteProof(wallet, platform);
    return NextResponse.json({
      success: true,
      cardId: result.cardId,
      identityRoot: result.identityRoot,
    });
  } catch (err) {
    if (err instanceof ProofConflictError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
