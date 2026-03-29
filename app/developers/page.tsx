const JS_QUICK_START = `const res = await fetch(
  'https://rialink-two.vercel.app/api/verify/WALLET_ADDRESS'
);
const identity = await res.json();

if (identity.trustLevel === 'high') {
  // wallet has 3 verified platforms - grant full access
}`;

const PYTHON_QUICK_START = `import requests
r = requests.get(
  'https://rialink-two.vercel.app/api/verify/WALLET_ADDRESS'
)
identity = r.json()

if identity['trustLevel'] == 'high':
    # grant access`;

const CURL_QUICK_START = `curl https://rialink-two.vercel.app/api/verify/WALLET_ADDRESS`;

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
  "evaluatedAt": "2025-03-29T10:00:00Z",
  "checks": [
    { "requirement": "platforms", "required": ["github","discord"], "passed": true },
    { "requirement": "minPlatforms", "required": 2, "actual": 2, "passed": true },
    { "requirement": "minRepoCount", "required": 5, "actual": 47, "passed": true }
  ],
  "accessToken": "vm_[base64-encoded-payload]"
}`;

const API_ROWS = [
  {
    method: "GET",
    path: "/api/verify/[wallet]",
    description: "Returns identity + trust level",
  },
  {
    method: "POST",
    path: "/api/policy/check",
    description: "Evaluate policy requirements",
  },
  {
    method: "POST",
    path: "/api/policy/verify",
    description: "Verify an access token",
  },
];

const USE_CASES = [
  {
    title: "DAO Grants",
    body: "Require verified GitHub + Discord before accepting grant applications",
  },
  {
    title: "Bounty Programs",
    body: "Only pay verified developer wallets",
  },
  {
    title: "Hackathons",
    body: "Prevent duplicate registrations with wallet-linked identity",
  },
  {
    title: "Community Access",
    body: "Gate Discord roles or token-gated content with verified identity",
  },
];

function CodePanel(props: { title: string; code: string }) {
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
          padding: "10px 12px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-default)",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          fontWeight: 500,
        }}
      >
        {props.title}
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

export default function DevelopersPage() {
  return (
    <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "96px 24px 80px" }}>
      <section
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          background: "linear-gradient(145deg, var(--bg-surface), var(--bg-elevated))",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "10px",
          }}
        >
          For Developers
        </p>
        <h1
          style={{
            fontSize: "34px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "10px",
          }}
        >
          Integrate identity into your dApp
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "720px" }}>
          One API call. No backend required. Works with any wallet on Rialo.
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--accent-text)",
              border: "1px solid rgba(92,225,230,0.35)",
              borderRadius: "999px",
              padding: "4px 10px",
              background: "var(--accent-muted)",
            }}
          >
            Free
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--success)",
              border: "1px solid rgba(52,211,153,0.3)",
              borderRadius: "999px",
              padding: "4px 10px",
              background: "var(--success-muted)",
            }}
          >
            No API Key Required
          </span>
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          background: "var(--bg-surface)",
          padding: "20px",
          marginBottom: "18px",
        }}
      >
        <h2 style={{ fontSize: "20px", letterSpacing: "-0.01em", marginBottom: "12px" }}>
          Quick Start
        </h2>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          {["JavaScript", "Python", "cURL"].map((tab) => (
            <span
              key={tab}
              style={{
                fontSize: "12px",
                border: "1px solid var(--border-default)",
                borderRadius: "999px",
                padding: "4px 10px",
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
              }}
            >
              {tab}
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          <CodePanel title="JavaScript" code={JS_QUICK_START} />
          <CodePanel title="Python" code={PYTHON_QUICK_START} />
          <CodePanel title="cURL" code={CURL_QUICK_START} />
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          background: "var(--bg-surface)",
          padding: "20px",
          marginBottom: "18px",
        }}
      >
        <h2 style={{ fontSize: "20px", letterSpacing: "-0.01em", marginBottom: "12px" }}>
          Gate access with policy checks
        </h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <CodePanel title="Request" code={POLICY_REQUEST} />
          <CodePanel title="Response" code={POLICY_RESPONSE} />
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          background: "var(--bg-surface)",
          padding: "20px",
          marginBottom: "18px",
        }}
      >
        <h2 style={{ fontSize: "20px", letterSpacing: "-0.01em", marginBottom: "12px" }}>
          Use Cases
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "10px",
          }}
        >
          {USE_CASES.map((item) => (
            <div
              key={item.title}
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "12px",
                background: "var(--bg-elevated)",
                padding: "14px",
              }}
            >
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                {item.title}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          background: "var(--bg-surface)",
          padding: "20px",
          marginBottom: "18px",
        }}
      >
        <h2 style={{ fontSize: "20px", letterSpacing: "-0.01em", marginBottom: "12px" }}>
          API Reference
        </h2>
        <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  Method
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  Path
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {API_ROWS.map((row, index) => (
                <tr key={row.path} style={{ background: index % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}>
                  <td style={{ padding: "10px 12px", fontSize: "13px", color: "var(--accent-text)", fontFamily: "monospace" }}>
                    {row.method}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: "13px", color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {row.path}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(92,225,230,0.24)",
          borderRadius: "16px",
          background: "linear-gradient(145deg, var(--bg-elevated), var(--bg-surface))",
          padding: "18px",
        }}
      >
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Rialo Integration
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "900px" }}>
          This API currently runs on Vercel infrastructure. When Rialo devnet launches, all proof storage and verification will move on-chain - making every proof permanent, auditable, and trustless. No API changes will be required for integrators.
        </p>
      </section>
    </main>
  );
}


