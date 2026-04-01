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

function maybeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric;
}

function isIsoTimestamp(value: unknown): boolean {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts);
}

function safeProofSignature(proofHash: string): string {
  try {
    return signProof(proofHash);
  } catch {
    // Legacy fallback so proof saving does not hard-fail during secret migration.
    return createHash("sha256")
      .update(`rialink:legacy-signature|${proofHash}`)
      .digest("hex");
  }
}

function fallbackBindingProof(args: {
  verifiedAt: string;
  proofMethod: string;
  walletProof?: {
    nonce?: string;
    signature?: string;
    message?: string;
  } | null;
}): ProofRecord["bindingProof"] {
  return {
    method: args.proofMethod || "legacy-client-payload",
    algorithm: "HS256",
    verifier: "rialink-api",
    issuedAt: args.verifiedAt,
    socialSessionId: "legacy",
    walletNonce: String(args.walletProof?.nonce || ""),
    walletSignature: String(args.walletProof?.signature || ""),
    walletMessage: String(args.walletProof?.message || ""),
    token: "",
  };
}

function buildLegacyProof(wallet: string, platform: Platform, body: Record<string, unknown>) {
  const verifiedAt = isIsoTimestamp(body.verifiedAt)
    ? String(body.verifiedAt)
    : new Date().toISOString();
  const proofHash = String(body.proofHash || "").trim();
  const usernameHash = String(body.usernameHash || "").trim();
  const maskedUsername = String(body.maskedUsername || "").trim();
  const providedUserId = String(body.userId || "").trim();
  const userId =
    providedUserId ||
    usernameHash ||
    `${platform}:legacy:${createHash("sha256")
      .update(`${wallet}|${platform}|${proofHash}`)
      .digest("hex")
      .slice(0, 16)}`;
  const username =
    String(body.username || "").trim() || maskedUsername || `legacy-${userId.slice(0, 8)}`;
  const fullName = String(body.fullName || body.full_name || "").trim();
  const proofMethod = String(body.proofMethod || "legacy-client-payload");
  const signature = safeProofSignature(proofHash);

  const proof: ProofRecord = {
    wallet,
    platform,
    userId,
    username,
    ...(fullName ? { fullName } : {}),
    verified: true,
    verifiedAt,
    nonce: "legacy",
    issuedAt: 0,
    signature,
    version: "v1",
    proofMethod,
    proofHash,
    bindingProof: fallbackBindingProof({ verifiedAt, proofMethod }),
    txSignature: placeholderTxSignature({ wallet, platform, proofHash, verifiedAt }),
    ...(maybeNumber(body.repoCount) !== undefined ? { repoCount: maybeNumber(body.repoCount) } : {}),
    ...(maybeNumber(body.commitCount) !== undefined
      ? { commitCount: maybeNumber(body.commitCount) }
      : {}),
    ...(maybeNumber(body.followerCount) !== undefined
      ? { followerCount: maybeNumber(body.followerCount) }
      : {}),
    ...(maybeNumber(body.serverCount) !== undefined
      ? { serverCount: maybeNumber(body.serverCount) }
      : {}),
    ...(body.pfpUrl ? { pfpUrl: String(body.pfpUrl) } : {}),
    ...(body.accountCreatedAt ? { accountCreatedAt: String(body.accountCreatedAt) } : {}),
    ...(usernameHash ? { usernameHash } : {}),
    ...(maskedUsername ? { maskedUsername } : {}),
  };
  return proof;
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
      proofs,
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
    const body = (await req.json()) as Record<string, unknown>;
    const wallet = String(body.wallet || "").trim();
    const platform = String(body.platform || "").trim() as Platform;
    const verificationToken = String(body.verificationToken || "").trim();
    const walletProof = body.walletProof as
      | {
          nonce?: string;
          issuedAt?: string;
          message?: string;
          signature?: string;
          wallet?: string;
        }
      | undefined;
    const legacyProofHash = String(body.proofHash || "").trim();

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

    let proof: ProofRecord;

    if (verificationToken) {
      if (!walletProof) {
        return NextResponse.json(
          { success: false, error: "Missing wallet proof" },
          { status: 400 }
        );
      }

      const walletCheck = await verifyWalletProof(wallet, walletProof as any);
      if (!walletCheck.ok) {
        return NextResponse.json(
          { success: false, error: walletCheck.error },
          { status: 401 }
        );
      }

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
      const signature = safeProofSignature(proofHash);

      let bindingProof: ProofRecord["bindingProof"];
      try {
        bindingProof = createBindingProof({
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
          walletProof: walletProof as any,
        });
      } catch (error) {
        console.error("POST /api/proof could not create signed binding proof", error);
        bindingProof = fallbackBindingProof({
          verifiedAt,
          proofMethod: socialSession.proofMethod,
          walletProof,
        });
      }

      proof = {
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
    } else {
      // Backward compatibility: accept legacy frontend payload shape.
      if (!legacyProofHash) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing or invalid fields",
            message: "Expected verificationToken or proofHash",
          },
          { status: 400 }
        );
      }
      proof = buildLegacyProof(wallet, platform, body);
    }

    const saved = await saveProof(wallet, proof);
    return NextResponse.json({
      success: true,
      proof: saved.proof,
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
    console.error("POST /api/proof failed", err);
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

    // Backward compatibility: legacy clients delete without walletProof.
    if (walletProof) {
      const verify = await verifyWalletProof(wallet, walletProof as any);
      if (!verify.ok) {
        return NextResponse.json(
          { success: false, error: verify.error },
          { status: 401 }
        );
      }
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
