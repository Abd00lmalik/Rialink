"use client";
import { useEffect, useState } from "react";
import type { ProofRecord } from "@/lib/types";

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="#7C3AED"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>);
}
function DiscordIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>);
}
function FarcasterIcon({ size = 16 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="#855DCD"><path d="M11.996 0C5.372 0 0 5.372 0 11.996c0 6.625 5.372 12 11.996 12C18.625 24 24 18.625 24 11.996 24 5.372 18.625 0 11.996 0zm5.24 17.08h-2.2v-4.702c0-.972-.385-1.46-1.154-1.46-.848 0-1.271.512-1.271 1.46v2.516h-2.19v-2.516c0-.948-.424-1.46-1.271-1.46-.77 0-1.155.488-1.155 1.46V17.08h-2.2V9.723h2.2v.95c.476-.73 1.19-1.097 2.14-1.097.963 0 1.72.4 2.27 1.2.564-.8 1.38-1.2 2.44-1.2 1.8 0 2.39 1.25 2.39 3.13V17.08zM7.42 8.33c-.73 0-1.32-.59-1.32-1.32 0-.73.59-1.32 1.32-1.32.73 0 1.32.59 1.32 1.32 0 .73-.59 1.32-1.32 1.32zm9.15 0c-.73 0-1.32-.59-1.32-1.32 0-.73.59-1.32 1.32-1.32.73 0 1.32.59 1.32 1.32 0 .73-.59 1.32-1.32 1.32z"/></svg>);
}

const ICONS: Record<string, (p: { size?: number }) => JSX.Element> = { github: GitHubIcon, discord: DiscordIcon, farcaster: FarcasterIcon };
const COLORS: Record<string, string> = { github: "#7C3AED", discord: "#5865F2", farcaster: "#855DCD" };
const NAMES: Record<string, string> = { github: "GitHub", discord: "Discord", farcaster: "Farcaster" };
const PLATFORMS = ["github", "discord", "farcaster"];

function truncate(addr: string) { return addr.slice(0, 6) + "..." + addr.slice(-4); }
function fmtHash(h: string) { return "0x" + h.slice(0, 4) + "..." + h.slice(-4); }
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}
function shortId(wallet: string) {
  return "#" + wallet.slice(-6).toUpperCase();
}

export default function CertificatePage({ params }: { params: { wallet: string } }) {
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(false);
  const wallet = params.wallet;

  useEffect(() => {
    fetch("/api/proof?wallet=" + wallet)
      .then(r => r.json())
      .then(d => setProofs(d.proofs || []))
      .catch(() => setProofs([]))
      .finally(() => setLoading(false));
  }, [wallet]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleMint() {
    setMinting(true);
    setTimeout(() => { setMinting(false); setMinted(true); }, 2200);
  }

  const count = proofs.length;
  const isFullyVerified = count === 3;
  const tweetText = encodeURIComponent("I just minted my VerifyMe identity certificate on @RialoProtocol. " + count + "/3 identities verified on-chain. No personal data stored. Just proof.");
  const tweetUrl = encodeURIComponent(typeof window !== "undefined" ? window.location.href : "https://verifyme-two.vercel.app/certificate/" + wallet);
  const issueDate = proofs.length > 0 ? fmtDate(proofs[proofs.length - 1].verifiedAt) : fmtDate(new Date().toISOString());

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 48px" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(92,225,230,0.07)", border: "1px solid rgba(92,225,230,0.15)", borderRadius: "20px", padding: "4px 12px", marginBottom: "14px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5CE1E6", display: "inline-block" }} />
            <span style={{ fontSize: "12px", color: "#5CE1E6", fontWeight: 500 }}>Rialo Identity NFT</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "6px", lineHeight: 1.2 }}>
            {isFullyVerified ? "Fully Verified Builder" : count > 0 ? count + " of 3 Verified" : "No Verifications Yet"}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>On-chain identity certificate · Non-transferable</p>
        </div>

        <div style={{ position: "relative", borderRadius: "24px", overflow: "hidden", background: "linear-gradient(145deg, #0A0F1E 0%, #0D1520 40%, #0A0E1A 100%)", border: "1px solid rgba(92,225,230,0.2)", boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(92,225,230,0.1)" }}>

          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "120px", background: "radial-gradient(ellipse at 50% 0%, rgba(92,225,230,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: "200px", height: "200px", background: "radial-gradient(circle at 100% 100%, rgba(124,58,237,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

          <div style={{ padding: "24px 24px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "18px", color: "#5CE1E6", fontWeight: 700 }}>VM</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>·</span>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>VerifyMe</span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>IDENTITY CERTIFICATE</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace", letterSpacing: "0.05em" }}>{shortId(wallet)}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Token ID</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #5CE1E6, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {wallet[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner</div>
                <div style={{ fontSize: "14px", fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 500 }}>{truncate(wallet)}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Score</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: isFullyVerified ? "#34D399" : "#5CE1E6" }}>{count}<span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 400 }}>/3</span></div>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Verified Identities</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {PLATFORMS.map(p => {
                  const proof = proofs.find(pr => pr.platform === p);
                  const verified = !!proof;
                  const Icon = ICONS[p];
                  return (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: verified ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.02)", border: verified ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(255,255,255,0.04)", transition: "all 0.2s ease" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: verified ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: verified ? 1 : 0.35 }}>
                        <Icon size={14} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: verified ? "var(--text-primary)" : "var(--text-muted)" }}>{NAMES[p]}</div>
                        {verified && proof && <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)", marginTop: "1px" }}>{fmtHash(proof.proofHash)}</div>}
                      </div>
                      {verified ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "20px", padding: "2px 8px" }}>
                          <span style={{ fontSize: "10px", color: "#34D399" }}>✓</span>
                          <span style={{ fontSize: "11px", color: "#34D399", fontWeight: 600 }}>Verified</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.5 }}>—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(92,225,230,0.2), transparent)", margin: "0 24px" }} />

          <div style={{ padding: "14px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Network</div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#34D399", display: "inline-block" }} />
                <span style={{ fontSize: "12px", color: "#34D399", fontWeight: 500 }}>Rialo Devnet</span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Standard</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Soulbound</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Issued</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{issueDate}</div>
            </div>
          </div>

          <div style={{ background: "rgba(92,225,230,0.04)", borderTop: "1px solid rgba(92,225,230,0.1)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Proof of identity · Non-transferable</div>
              <div style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(92,225,230,0.5)" }}>verifyme.rialo · ERC-5192 Soulbound</div>
            </div>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(92,225,230,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "16px", color: "#5CE1E6", fontWeight: 700 }}>✓</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>


          
            href={"https://twitter.com/intent/tweet?text=" + encodeURIComponent("Just verified my builder identity on-chain using @VerifyMe — built on @RialoProtocol. " + count + "/3 identities cryptographically proven. No personal data stored. Just proof.\n\nThis is what Web3 identity should look like 🔐") + "&url=" + tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "48px", borderRadius: "12px", background: "#000", border: "1px solid #2a2a2a", color: "#fff", fontSize: "14px", fontWeight: 600, textDecoration: "none", letterSpacing: "-0.01em" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </a>
          <button onClick={copyLink} style={{ width: "100%", height: "42px", borderRadius: "10px", background: "transparent", border: "1px solid var(--border-default)", color: copied ? "var(--success)" : "var(--text-secondary)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            {copied ? "✓ Copied!" : "Copy link"}
          </button>

          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "4px" }}>
            <a href={"/profile/" + wallet} style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>View profile →</a>
            <a href="/verify" style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "none" }}>Dashboard →</a>
          </div>
        </div>

      </div>
    </div>
  );
}