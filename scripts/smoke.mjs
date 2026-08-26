// Smoke tests for Rialink's public surface.
// Usage: BASE_URL=https://rialink.vercel.app npm run smoke
// Exits non-zero if any expectation fails.

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const WALLET =
  process.env.SMOKE_WALLET || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

let failures = 0;

function check(name, condition, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`${status}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function main() {
  console.log(`Smoke testing ${BASE_URL}\n`);

  // Landing page
  try {
    const res = await fetch(`${BASE_URL}/`);
    check("GET /", res.status === 200, `status ${res.status}`);
  } catch (e) {
    check("GET /", false, String(e));
  }

  // Health
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const body = await json(res);
    check(
      "GET /api/health",
      res.status === 200 && body.status === "ok",
      JSON.stringify(body)
    );
  } catch (e) {
    check("GET /api/health", false, String(e));
  }

  // Stats: real numbers or loud failure (never fabricated zeros)
  try {
    const res = await fetch(`${BASE_URL}/api/stats`);
    const body = await json(res);
    const ok =
      res.status === 200
        ? typeof body.wallets === "number" && typeof body.proofs === "number"
        : res.status === 503 && Boolean(body.error);
    check("GET /api/stats", ok, `status ${res.status}`);
  } catch (e) {
    check("GET /api/stats", false, String(e));
  }

  // Public verifier
  try {
    const res = await fetch(`${BASE_URL}/api/verify/${WALLET}`, { cache: "no-store" });
    const body = await json(res);
    check(
      "GET /api/verify/[wallet]",
      res.status === 200 &&
        body.wallet === WALLET &&
        typeof body.trustLevel === "string" &&
        Array.isArray(body.verifiedPlatforms),
      `trustLevel=${body.trustLevel}`
    );
  } catch (e) {
    check("GET /api/verify/[wallet]", false, String(e));
  }

  // Challenge for a valid wallet must work
  let nonce = null;
  try {
    const res = await fetch(`${BASE_URL}/api/challenge?wallet=${WALLET}`, {
      cache: "no-store",
    });
    const body = await json(res);
    nonce = body?.nonce || null;
    check(
      "GET /api/challenge?wallet=<valid>",
      res.status === 200 && typeof nonce === "string" && Boolean(body.issuedAt),
      res.status === 200 ? "" : `status ${res.status}`
    );
  } catch (e) {
    check("GET /api/challenge?wallet=<valid>", false, String(e));
  }

  // Invalid wallet must be rejected before touching storage
  try {
    const res = await fetch(`${BASE_URL}/api/challenge?wallet=not-a-wallet`);
    check("GET /api/challenge?wallet=<invalid>", res.status === 400);
  } catch (e) {
    check("GET /api/challenge?wallet=<invalid>", false, String(e));
  }

  // SECURITY REGRESSION: proof creation without a verification session must fail
  try {
    const res = await fetch(`${BASE_URL}/api/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: WALLET,
        platform: "github",
        userId: "1337",
        username: "attacker",
        proofHash: "a".repeat(64),
      }),
    });
    const body = await json(res);
    check(
      "SECURITY POST /api/proof without verificationToken is rejected",
      res.status === 400,
      `status ${res.status}, error=${body.error || "none"}`
    );
  } catch (e) {
    check("SECURITY POST /api/proof without verificationToken is rejected", false, String(e));
  }

  // Policy check
  try {
    const res = await fetch(`${BASE_URL}/api/policy/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: WALLET, policy: "dao-grant" }),
    });
    const body = await json(res);
    check(
      "POST /api/policy/check",
      res.status === 200 && typeof body.passed === "boolean",
      `passed=${body.passed}`
    );
  } catch (e) {
    check("POST /api/policy/check", false, String(e));
  }

  // Badge
  try {
    const res = await fetch(`${BASE_URL}/badge/${WALLET}`);
    check(
      "GET /badge/[wallet]",
      res.status === 200 && (await res.text()).includes("Rialink Badge")
    );
  } catch (e) {
    check("GET /badge/[wallet]", false, String(e));
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
