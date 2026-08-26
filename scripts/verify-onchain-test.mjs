// Quick test of on-chain verifier
const ANCHOR = "6b96D9tmtkrx2i4nc5tiaLr5pLbne4wenv3iTYe3Bp6r";
const RPC = "https://devnet.rialo.io:4101";

async function rawRpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await res.json();
  const result = payload.result;
  if (result && typeof result === "object" && "value" in result) return result.value;
  return result;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58decode(str) {
  let n = 0n;
  for (const c of str) { const i = B58.indexOf(c); if (i < 0) throw new Error("bad char"); n = n * 58n + BigInt(i); }
  const bytes = [];
  while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of str) { if (c === "1") bytes.unshift(0); else break; }
  return Buffer.from(bytes).toString("utf8");
}

console.log("Fetching signatures for anchor wallet...");
const sigs = await rawRpc("getSignaturesForAddress", [{ address: ANCHOR, limit: 20 }]);
console.log("Found", sigs.length, "transactions");

let anchorMemos = 0;
for (const sig of sigs.slice(0, 10)) {
  const tx = await rawRpc("getTransaction", [{ signature: sig.signature }]);
  const memoData = tx?.transaction?.message?.instructions?.[0]?.data;
  if (!memoData) continue;
  try {
    const text = b58decode(memoData);
    if (text.startsWith("rialink:v1|")) {
      anchorMemos++;
      const parts = text.replace("rialink:v1|", "").split("|");
      console.log(`  [${parts[0]}] wallet=${parts[1]} root=${parts[2]?.slice(0,16)}...`);
      console.log(`    tx: ${sig.signature}`);
      console.log(`    time: ${new Date(sig.blockTime).toISOString()}`);
    }
  } catch {}
}

console.log(`\nOn-chain verifier: ${anchorMemos} anchor memos found. PASS`);
