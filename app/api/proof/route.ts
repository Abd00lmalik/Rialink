import { createHash } from "crypto";
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
import { consumeVerifiedSocialSession } from "@/lib/server/verification-session";

export const runtime = "nodejs";

const PLATFORMS = new Set<Platform>(["github", "discord", "farcaster"]);

function toApiProof(proof: ProofRecord) {
  return {
    platform: proof.platform,
    user_id: proof.userId,
    userId: proof.userId,
    username: proof.username,
    full_name: proof.fullName,
    fullName: proof.fullName,
    verified: proof.verified,
    verified_at: proof.verifiedAt,
    verifiedAt: proof.verifiedAt,
    proof_hash: proof.proofHash,
    proofHash: proof.proofHash,
    proof_method: proof.proofMethod,
    proofMethod: proof.proofMethod,
    binding_proof: proof.bindingProof,
    bindingProof: proof.bindingProof,
    tx_signature: proof.txSignature || null,
    txSignature: proof.txSignature || null,
    repoCount: proof.repoCount,
    commitCount: proof.commitCount,
    followerCount: proof.followerCount,
    serverCount: proof.serverCount,
    pfpUrl: proof.pfpUrl,
    accountCreatedAt: proof.accountCreatedAt,
  };
}

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
  const wallet = String(req.nextUrl.searchParams.get("wallet") || "").trim();
  if (!wallet) return NextResponse.json({ proofs: [] });

  try {
    const proofs = await getProofs(wallet);
    const identityRoot = await getIdentityRoot(wallet);
    const cardId = cardIdFromWallet(wallet);
    return NextResponse.json({
      proofs: proofs.map(toApiProof),
      identityRoot,
      cardId,
    });
  } catch {
    return NextResponse.json({ proofs: [] });
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
    const proofHash = computeProofHash({
      wallet,
      platform,
      platformUserId: socialSession.userId,
    });

    const bindingProof = createBindingProof({
      wallet,
      platform,
      userId: socialSession.userId,
      username: socialSession.username,
      proofHash,
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
      proof: toApiProof(saved.proof),
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
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
