import { NextRequest, NextResponse } from "next/server";
import { createPolicyToken, evaluatePolicy } from "@/lib/server/policy";
import { POLICY_PRESETS, type VerificationPolicy } from "@/lib/policy";

const DEFAULT_TTL_SECONDS = Number(process.env.POLICY_TOKEN_TTL_SECONDS || 600);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wallet = String(body.wallet || "").trim();
    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
    }

    let policy: VerificationPolicy | undefined = body.policy;
    const policyId = body.policyId ? String(body.policyId) : "";
    if (!policy && policyId && POLICY_PRESETS[policyId]) {
      policy = { ...POLICY_PRESETS[policyId].policy, id: policyId };
    }

    if (!policy) {
      return NextResponse.json({ error: "Missing policy" }, { status: 400 });
    }

    if (policyId && !policy.id) {
      policy = { ...policy, id: policyId };
    }

    const ttlSeconds = Math.max(60, Number(body.ttlSeconds || DEFAULT_TTL_SECONDS));
    const evaluation = await evaluatePolicy(wallet, policy);

    let accessToken: string | null = null;
    let expiresAt: number | null = null;
    if (evaluation.eligible) {
      const issuedAt = Date.now();
      expiresAt = issuedAt + ttlSeconds * 1000;
      accessToken = createPolicyToken({
        wallet,
        policy,
        platforms: evaluation.platforms,
        identityRoot: evaluation.identityRoot,
        issuedAt,
        expiresAt,
      });
    }

    return NextResponse.json({
      eligible: evaluation.eligible,
      reasons: evaluation.reasons,
      wallet,
      policy,
      policyId: policyId || undefined,
      platforms: evaluation.platforms,
      identityRoot: evaluation.identityRoot,
      cardId: evaluation.cardId,
      accessToken,
      expiresAt,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Policy check failed" }, { status: 500 });
  }
}
