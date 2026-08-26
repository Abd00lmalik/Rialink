// Generates an Ed25519 anchor wallet for Rialo anchoring.
// Prints the public address (share freely) and the base58 seed (SECRET).
//
// SECURITY: never commit the seed. Put it in Vercel env vars as
// RIALINK_ANCHOR_SECRET and store it in a password manager.
import nacl from "tweetnacl";
import bs58 from "bs58";

const { secretKey, publicKey } = nacl.sign.keyPair();
const seed = secretKey.slice(0, 32);

console.log("ANCHOR_ADDRESS (public, fund this):", bs58.encode(publicKey));
console.log("RIALINK_ANCHOR_SECRET (base58 seed, KEEP SECRET):", bs58.encode(seed));
console.log("\nNext steps:");
console.log("1. Fund ANCHOR_ADDRESS via the Rialo testnet faucet (~1 RLO is enough for ~200k anchors).");
console.log("2. Add RIALINK_ANCHOR_SECRET to Vercel environment variables.");
console.log('3. Verify: GET /api/health should show anchorDetail.configured = true.');
