// End-to-end validation of Rialo anchoring outside Next.js:
//   balance -> anchor-format memo tx -> chain read-back -> decode -> roundtrip
//
// Usage:
//   RIALINK_ANCHOR_SECRET=<base58 seed> RIALO_RPC_URL=https://devnet.rialo.io:4101 \
//   node scripts/anchor-selftest.mjs [wallet] [identityRootHex]
import bs58 from "bs58";
import {
  Keypair,
  PublicKey,
  TransactionBuilder,
  createRialoClient,
  RIALO_DEVNET_CHAIN,
} from "@rialo/ts-cdk";

const RPC_URL = process.env.RIALO_RPC_URL || "https://devnet.rialo.io:4101";
const MEMO_PROGRAM_ADDRESS = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const WALLET = process.argv[2] || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const ROOT = process.argv[3] || "a".repeat(64);

function b58decodeToText(str) {
  let n = 0n;
  for (const c of str) {
    const i = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".indexOf(c);
    if (i < 0) throw new Error(`bad base58 char ${c}`);
    n = n * 58n + BigInt(i);
  }
  const bytes = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n /= 256n;
  }
  for (const c of str) {
    if (c === "1") bytes.unshift(0);
    else break;
  }
  return Buffer.from(bytes).toString("utf8");
}

async function rawRpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

async function main() {
  if (!process.env.RIALINK_ANCHOR_SECRET) throw new Error("set RIALINK_ANCHOR_SECRET");
  const signer = Keypair.fromSecretKey(bs58.decode(process.env.RIALINK_ANCHOR_SECRET));
  const address = String(signer.publicKey);
  console.log("anchor address:", address);

  const chain =
    RPC_URL === RIALO_DEVNET_CHAIN.rpcUrl
      ? RIALO_DEVNET_CHAIN
      : { ...RIALO_DEVNET_CHAIN, rpcUrl: RPC_URL };
  const client = createRialoClient({ chain });

  const balance = await client.getBalance(signer.publicKey);
  console.log("balance (kelvin):", String(balance));
  if (BigInt(balance) < 10_000n) throw new Error("anchor wallet needs funding");

  const payload = `rialink:v1|create|${WALLET}|${ROOT}`;
  console.log("payload:", payload.slice(0, 80) + "...");

  const prefix = await client.getConfigHashPrefix();
  const tx = TransactionBuilder.create()
    .setPayer(signer.publicKey)
    .setValidFrom(BigInt(Date.now()))
    .setConfigHashPrefix(prefix)
    .addInstruction({
      programId: PublicKey.fromString(MEMO_PROGRAM_ADDRESS),
      accounts: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
      data: new TextEncoder().encode(payload),
    })
    .build();
  const sent = await client.sendAndConfirmTransaction(tx.sign(signer).serialize());
  const signature =
    typeof sent === "object" && sent !== null && typeof sent.signature === "string"
      ? sent.signature
      : String(sent);
  console.log("tx signature:", signature);
  console.log("explorer:", `${RPC_URL.includes("testnet") ? "https://testnet.rialoscan.org" : "https://devnet.rialoscan.org"}/tx/${signature}`);

  const g = await rawRpc("getTransaction", [{ signature }]);
  const err = g?.result?.meta?.err ?? null;
  const memoB58 = g?.result?.transaction?.message?.instructions?.[0]?.data ?? "";
  const decoded = b58decodeToText(memoB58);
  console.log("onchain err:", JSON.stringify(err));
  console.log("decoded memo matches payload:", decoded === payload);

  const after = await client.getBalance(signer.publicKey);
  console.log("balance after:", String(after), "(fee 5000 kelvin)");
  console.log(decoded === payload && err === null ? "\nSELFTEST PASS" : "\nSELFTEST FAIL");
  process.exit(decoded === payload && err === null ? 0 : 1);
}

main().catch((e) => {
  console.error("SELFTEST ERROR:", e?.message ?? e);
  process.exit(1);
});
