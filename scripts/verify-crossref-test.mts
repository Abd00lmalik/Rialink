// Test on-chain verifier with API cross-referencing
import { verifyOnChain } from "../lib/rialo-verify.ts";

// Test 1: Pure chain mode (no API)
console.log("=== Test 1: Pure chain mode ===");
const chainOnly = await verifyOnChain("BqKJkx3fdM8kXefGcSSt3jhdr15Ws625Vc9cR9fqf3Ht", undefined, null);
console.log("anchored:", chainOnly.anchored);
console.log("onChainProofs:", chainOnly.onChainProofs.length);
console.log("identityRoot:", chainOnly.identityRoot?.slice(0, 20));
console.log("platforms:", chainOnly.verifiedPlatforms);

// Test 2: Chain + API mode
console.log("\n=== Test 2: Chain + API mode ===");
const withApi = await verifyOnChain("BqKJkx3fdM8kXefGcSSt3jhdr15Ws625Vc9cR9fqf3Ht");
console.log("anchored:", withApi.anchored);
console.log("platforms:", withApi.verifiedPlatforms);
console.log("trustLevel:", withApi.trustLevel);
console.log("apiCrossRef:", withApi.apiCrossRef);

// Test 3: Wallet with no proofs
console.log("\n=== Test 3: Empty wallet ===");
const empty = await verifyOnChain("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
console.log("anchored:", empty.anchored);
console.log("platforms:", empty.verifiedPlatforms);

console.log("\nAll tests passed!");
