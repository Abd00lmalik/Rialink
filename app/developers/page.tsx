import { ApiPlayground } from "@/components/developers/ApiPlayground";

const JS_SDK = `import { Rialink } from "@rialink/sdk";

const rialink = new Rialink("https://rialink.vercel.app");

// Verify a wallet — returns identity + trust level
const identity = await rialink.verify("BqKJkx...f3Ht");

if (identity.trustLevel === "high") {
  // 3 platforms verified — grant access
}

// Check policy requirements
const result = await rialink.checkPolicy("BqKJkx...f3Ht", {
  platforms: ["github", "discord"],
  minPlatforms: 2,
  minRepoCount: 5,
});

if (result.passed) {
  // wallet meets requirements
}`;

const REACT_HOOKS = `import { useRialink, RialinkBadge } from "@rialink/react";

function MyComponent({ wallet }) {
  const { identity, isLoading } = useRialink(wallet);

  if (isLoading) return <Spinner />;
  if (!identity?.valid) return <span>Not verified</span>;

  return (
    <div>
      <RialinkBadge wallet={wallet} />
      <p>Trust: {identity.trustLevel}</p>
      <p>Platforms: {identity.proofs.length}/3</p>
    </div>
  );
}`;

const JS_QUICK_START = `// Verify a wallet — no auth required
const res = await fetch(
  "https://rialink.vercel.app/api/verify/WALLET_ADDRESS"
);
const identity = await res.json();

if (identity.valid && identity.trustLevel === "high") {
  // wallet is verified on 3 platforms
}`;

const PYTHON_QUICK_START = `import requests

r = requests.get(
    "https://rialink.vercel.app/api/verify/WALLET_ADDRESS"
)
identity = r.json()

if identity["trustLevel"] == "high":
    # grant access`;

const CURL_QUICK_START = `curl https://rialink.vercel.app/api/verify/WALLET_ADDRESS`;

const ANCHOR_WALLET_ADDRESS = "6b96D9tmtkrx2i4nc5tiaLr5pLbne4wenv3iTYe3Bp6r";

const RECEIPT_PAYLOAD_FORMAT = `rialink:v1|<action>|<wallet>|<identityRoot>

action        "create" or "revoke"
wallet        the subject wallet address
identityRoot  64-char lowercase hex sha256

Example:
rialink:v1|create|7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU|3f7a91c0...c9e2`;

const IDENTITY_ROOT_RECIPE = `// Recompute a wallet's identity root from public proof data:
proofHashes = proofs.map(p => p.proofHash).sort()
identityRoot = sha256("rialink:root:v1|" + proofHashes.join("|"))

// proofHash itself is returned by GET /api/verify/[wallet],
// so the whole computation is reproducible without trusting us.`;

const VERIFY_RECEIPT_STEPS = `1. Open the receipt link: https://devnet.rialoscan.org/tx/<txSignature>
2. Confirm the fee payer / signer is the official Rialink anchor wallet:
   ${ANCHOR_WALLET_ADDRESS}
3. Read instruction #1 memo data (base58) and decode it.
4. Check it matches: rialink:v1|<action>|<wallet>|<identityRoot>
5. Recompute <identityRoot> from GET /api/verify/[wallet] using the recipe
   below. Match => the attested state is publicly guaranteed.

Prefer raw JSON-RPC? POST https://devnet.rialo.io:4101
  {"jsonrpc":"2.0","id":1,"method":"getTransaction",
   "params":[{"signature":"<txSignature>"}]}`;

const POLICY_REQUEST = `POST /api/policy/check
Content-Type: application/json

{
  "wallet": "BqKJkx...f3Ht",
  "policy": "dao-grant",
  "requirements": {
    "platforms": ["github", "discord"],
    "minPlatforms": 2,
    "minRepoCount": 5,
    "maxProofAgeDays": 90
  }
}`;

const POLICY_RESPONSE = `{
  "wallet": "BqKJkx...f3Ht",
  "policy": "dao-grant",
  "passed": true,
  "trustLevel": "high",
  "evaluatedAt": "2026-08-26T10:00:00Z",
  "checks": [
    { "requirement": "platforms", "required": ["github","discord"], "passed": true },
    { "requirement": "minPlatforms", "required": 2, "actual": 2, "passed": true },
    { "requirement": "minRepoCount", "required": 5, "actual": 47, "passed": true }
  ],
  "accessToken": "vm_[base64-encoded-payload]"
}`;

const INTEGRATION_SNIPPET = `// In your Rialo app — verify before granting access
import { Rialink } from "@rialink/sdk";

const rialink = new Rialink();

export async function checkAccess(wallet: string) {
  const identity = await rialink.verify(wallet);

  if (!identity.valid) {
    return { allowed: false, reason: "Wallet not verified" };
  }

  if (identity.trustLevel === "none") {
    return { allowed: false, reason: "Verify at least one platform" };
  }

  // Check specific requirements
  const policy = await rialink.checkPolicy(wallet, {
    platforms: ["github"],
    minPlatforms: 1,
  });

  return {
    allowed: policy.passed,
    trustLevel: identity.trustLevel,
    platforms: identity.proofs.map(p => p.platform),
  };
}`;

const EMBED_SNIPPET = `<!-- Drop-in verification badge for any website -->
<script type="module">
  import { createBadge } from "https://rialink.vercel.app/embed.js";
  createBadge(document.getElementById("badge"), {
    wallet: "BqKJkx...f3Ht",
    theme: "dark",
  });
</script>
<div id="badge"></div>`;

const API_ROWS = [
  {
    method: "GET",
    path: "/api/verify/[wallet]",
    description: "Public identity + trust level for a wallet",
    auth: "None",
  },
  {
    method: "POST",
    path: "/api/policy/check",
    description: "Evaluate policy requirements against a wallet",
    auth: "None",
  },
  {
    method: "POST",
    path: "/api/policy/verify",
    description: "Verify a policy access token",
    auth: "None",
  },
  {
    method: "GET",
    path: "/api/proof?wallet=",
    description: "List proofs for a wallet (requires wallet proof)",
    auth: "Wallet signature",
  },
  {
    method: "POST",
    path: "/api/proof",
    description: "Save a verified proof (requires session token)",
    auth: "Session + wallet",
  },
  {
    method: "GET",
    path: "/api/health",
    description: "Service health + anchor status",
    auth: "None",
  },
  {
    method: "GET",
    path: "/api/stats",
    description: "Network stats: total wallets, proofs, platforms",
    auth: "None",
  },
];

const USE_CASES = [
  {
    title: "DAO Access Control",
    body: "Gate proposal voting to wallets with 2+ verified platforms. Use policy tokens for gasless on-chain checks.",
    code: "const policy = await rialink.checkPolicy(wallet, {\n  minPlatforms: 2,\n  platforms: ['github', 'discord']\n});",
  },
  {
    title: "Airdrop Sybil Resistance",
    body: "Filter multi-wallet farming by requiring signed identity proofs. Each wallet maps to one real person.",
    code: "const identity = await rialink.verify(wallet);\nif (identity.trustLevel === 'none') reject();",
  },
  {
    title: "Reputation Portability",
    body: "Carry your verified identity across Rialo apps. One wallet, one identity, everywhere.",
    code: "const identity = await rialink.verify(wallet);\n// Show same badge across all your apps",
  },
  {
    title: "Bot Filtering",
    body: "Reject low-trust or unverifiable wallets before they spam forms, APIs, and airdrops.",
    code: "if (!identity.valid || identity.trustLevel === 'none') {\n  return { error: 'Verification required' };\n}",
  },
  {
    title: "Contributor Badges",
    body: "Display public proof-backed badges on profiles, dashboards, and contributor pages.",
    code: "<RialinkBadge wallet={wallet} />",
  },
  {
    title: "Cross-App Identity",
    body: "Your Rialink verification works across every Rialo dApp. Build once, trust everywhere.",
    code: "// Same wallet, same identity, any app\nconst identity = await rialink.verify(wallet);",
  },
];

function CodePanel(props: { title: string; code: string; filename?: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-default)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          {props.title}
        </span>
        {props.filename && (
          <span style={{ fontSize: "11px", color: "var(--text-faint)", fontFamily: "monospace" }}>
            {props.filename}
          </span>
        )}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "14px",
          background: "var(--bg-base)",
          color: "var(--text-secondary)",
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: 1.7,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {props.code}
      </pre>
    </div>
  );
}

function SectionCard(props: { children: React.ReactNode; accent?: boolean }) {
  return (
    <section
      style={{
        border: props.accent ? "1px solid rgba(62,235,220,0.24)" : "1px solid var(--border-subtle)",
        borderRadius: "16px",
        background: props.accent
          ? "linear-gradient(145deg, var(--bg-elevated), var(--bg-surface))"
          : "var(--bg-surface)",
        padding: "20px",
        marginBottom: "16px",
      }}
    >
      {props.children}
    </section>
  );
}

function SectionTitle(props: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: "20px", letterSpacing: "-0.01em", color: "var(--text-primary)", marginBottom: props.sub ? 4 : 0 }}>
        {props.children}
      </h2>
      {props.sub && (
        <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "760px" }}>{props.sub}</p>
      )}
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "96px 24px 80px" }}>

      {/* ─── Hero ──────────────────────────────────────────────── */}
      <SectionCard accent>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          For Developers
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 10 }}>
          Build with Rialink Identity
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: 720, lineHeight: 1.65 }}>
          One API call to verify a wallet across GitHub, Discord, and Farcaster.
          On-chain receipts on Rialo. No API key required.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span className="verify-badge-network-chip" style={{ color: "var(--accent-text)" }}>Free</span>
          <span className="verify-badge-network-chip">No API Key</span>
          <span className="verify-badge-network-chip">Rialo Native</span>
        </div>
      </SectionCard>

      {/* ─── Three integration paths ───────────────────────────── */}
      <SectionCard>
        <SectionTitle sub="Three ways to integrate, from simplest to most powerful.">
          Integration Paths
        </SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {/* REST API */}
          <div style={{ border: "1px solid var(--border-default)", borderRadius: 12, padding: 16, background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>REST API</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
              Hit <code style={{ fontSize: 11, background: "var(--bg-base)", padding: "1px 4px", borderRadius: 4 }}>GET /api/verify/:wallet</code> from any runtime. Zero setup.
            </p>
            <CodePanel title="cURL" code={CURL_QUICK_START} />
          </div>
          {/* npm SDK */}
          <div style={{ border: "1px solid var(--border-default)", borderRadius: 12, padding: 16, background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>npm SDK</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
              Typed helpers for verify, policy checks, and proof management. Works in Node, Deno, and edge runtimes.
            </p>
            <CodePanel title="JavaScript" code={JS_SDK} filename="npm install @rialink/sdk" />
          </div>
          {/* React Hooks */}
          <div style={{ border: "1px solid var(--border-default)", borderRadius: 12, padding: 16, background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>React Hooks + Components</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
              Drop-in <code style={{ fontSize: 11, background: "var(--bg-base)", padding: "1px 4px", borderRadius: 4 }}>useRialink()</code> hook and <code style={{ fontSize: 11, background: "var(--bg-base)", padding: "1px 4px", borderRadius: 4 }}>&lt;RialinkBadge /&gt;</code> component.
            </p>
            <CodePanel title="React" code={REACT_HOOKS} filename="@rialink/react" />
          </div>
        </div>
      </SectionCard>

      {/* ─── Quick Start ───────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle sub="Use the REST API directly from any runtime. Base URL: https://rialink.vercel.app">
          Quick Start
        </SectionTitle>
        <div style={{ display: "grid", gap: 12 }}>
          <CodePanel title="JavaScript" code={JS_QUICK_START} />
          <CodePanel title="Python" code={PYTHON_QUICK_START} />
        </div>
      </SectionCard>

      {/* ─── Live API Playground ────────────────────────────────── */}
      <ApiPlayground />

      {/* ─── Playground Integration (the sauce) ────────────────── */}
      <SectionCard accent>
        <SectionTitle sub="Drop Rialink into any Rialo playground app. Your users carry their verified identity everywhere.">
          Playground Integration
        </SectionTitle>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16, maxWidth: 800 }}>
          Rialink is identity infrastructure for the Rialo ecosystem. When a user verifies their wallet on Rialink,
          that verification travels with them to every dApp on Rialo. No re-verification, no re-signing.
          Your playground app reads the same identity root that Rialink anchors on-chain.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Verify once", desc: "User links GitHub, Discord, Farcaster on Rialink" },
            { label: "Use everywhere", desc: "Every Rialo app reads the same verified identity" },
            { label: "On-chain proof", desc: "Identity root anchored on Rialo — tamper-evident" },
            { label: "Composable", desc: "Build trust logic on top of Rialink's identity state" },
          ].map((item) => (
            <div key={item.label} style={{ padding: 12, borderRadius: 10, background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-text)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <CodePanel title="Integration example" code={INTEGRATION_SNIPPET} filename="lib/access.ts" />
      </SectionCard>

      {/* ─── On-chain receipts ─────────────────────────────────── */}
      <SectionCard>
        <SectionTitle sub="Every identity change is anchored on Rialo as a public, tamper-evident memo transaction.">
          On-Chain Receipts (Rialo Anchoring)
        </SectionTitle>
        <div style={{ display: "grid", gap: 12 }}>
          <CodePanel title="Memo payload format" code={RECEIPT_PAYLOAD_FORMAT} />
          <CodePanel title="How to verify a receipt independently" code={VERIFY_RECEIPT_STEPS} />
          <CodePanel title="Identity root recipe" code={IDENTITY_ROOT_RECIPE} />
        </div>
      </SectionCard>

      {/* ─── Embeddable Widget ─────────────────────────────────── */}
      <SectionCard>
        <SectionTitle sub="Drop a verification badge into any website with one script tag.">
          Embeddable Widget
        </SectionTitle>
        <div style={{ display: "grid", gap: 12 }}>
          <CodePanel title="HTML" code={EMBED_SNIPPET} filename="index.html" />
        </div>
      </SectionCard>

      {/* ─── Policy Engine ─────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle sub="Define access rules. Rialink evaluates them against a wallet's verified identity.">
          Policy Engine
        </SectionTitle>
        <div style={{ display: "grid", gap: 12 }}>
          <CodePanel title="Request" code={POLICY_REQUEST} />
          <CodePanel title="Response" code={POLICY_RESPONSE} />
        </div>
      </SectionCard>

      {/* ─── Use Cases ─────────────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>Use Cases</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {USE_CASES.map((item) => (
            <div
              key={item.title}
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                background: "var(--bg-elevated)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 14px 10px" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.body}</p>
              </div>
              <pre style={{ margin: 0, padding: "10px 14px", background: "var(--bg-base)", borderTop: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {item.code}
              </pre>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ─── Full API Reference ────────────────────────────────── */}
      <SectionCard>
        <SectionTitle>API Reference</SectionTitle>
        <div style={{ border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Method", "Path", "Auth", "Description"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, color: "var(--text-muted)", borderBottom: "1px solid var(--border-default)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {API_ROWS.map((row, i) => (
                <tr key={row.path} style={{ background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--accent-text)", fontFamily: "monospace", fontWeight: 500 }}>
                    {row.method}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {row.path}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: "var(--text-muted)" }}>
                    {row.auth}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ─── Rialo Ecosystem ───────────────────────────────────── */}
      <SectionCard accent>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Rialo Ecosystem
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 900 }}>
          Rialink is identity infrastructure for Rialo. Every proof is anchored on-chain,
          every verification is portable across dApps, and every wallet carries its own
          reputation. Build with it — your users&apos; identity travels with them.
        </p>
      </SectionCard>
    </main>
  );
}
