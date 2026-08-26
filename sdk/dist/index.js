"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Rialink: () => Rialink,
  buildIdentity: () => buildIdentity,
  checkPolicy: () => checkPolicy,
  deriveTrustLevel: () => deriveTrustLevel,
  evaluatePolicy: () => evaluatePolicy,
  fetchVerification: () => fetchVerification,
  formatIdentity: () => formatIdentity
});
module.exports = __toCommonJS(index_exports);

// src/verify.ts
var DEFAULT_BASE_URL = "https://rialink.vercel.app";
async function fetchVerification(wallet, baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(`${baseUrl}/api/verify/${wallet}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      `verify_failed: ${res.status} ${body?.error || res.statusText}`
    );
  }
  return res.json();
}
function deriveTrustLevel(totalVerified) {
  if (totalVerified >= 3) return "high";
  if (totalVerified >= 2) return "medium";
  if (totalVerified >= 1) return "low";
  return "none";
}

// src/policy.ts
function evaluatePolicy(verification, requirements) {
  const results = requirements.map((req) => {
    if (req.trustLevel) {
      const levelOrder = { none: 0, low: 1, medium: 2, high: 3 };
      if (levelOrder[verification.trustLevel] < levelOrder[req.trustLevel]) {
        return {
          requirement: req,
          met: false,
          reason: `trust level ${verification.trustLevel} < required ${req.trustLevel}`
        };
      }
    }
    const proof = req.platform ? verification.proofs.find((p) => p.platform === req.platform) : void 0;
    if (req.platform && !proof) {
      return {
        requirement: req,
        met: false,
        reason: `platform ${req.platform} not verified`
      };
    }
    if (req.minRepos !== void 0 && proof && proof.repoCount !== void 0) {
      if (proof.repoCount < req.minRepos) {
        return {
          requirement: req,
          met: false,
          reason: `repo count ${proof.repoCount} < required ${req.minRepos}`
        };
      }
    }
    if (req.minFollowers !== void 0 && proof && proof.followerCount !== void 0) {
      if (proof.followerCount < req.minFollowers) {
        return {
          requirement: req,
          met: false,
          reason: `follower count ${proof.followerCount} < required ${req.minFollowers}`
        };
      }
    }
    if (req.minAccountAgeDays !== void 0 && proof) {
      const accountAgeMs = proof.issuedAt ? Date.now() - proof.issuedAt : 0;
      const accountAgeDays = Math.floor(accountAgeMs / (1e3 * 60 * 60 * 24));
      if (accountAgeDays < req.minAccountAgeDays) {
        return {
          requirement: req,
          met: false,
          reason: `account age ${accountAgeDays}d < required ${req.minAccountAgeDays}d`
        };
      }
    }
    if (req.requiresAnchored && proof) {
      if (!proof.chain || !proof.txSignature) {
        return {
          requirement: req,
          met: false,
          reason: "proof not anchored on-chain"
        };
      }
    }
    return { requirement: req, met: true, reason: "passed" };
  });
  return {
    wallet: verification.wallet,
    pass: results.every((r) => r.met),
    requirements,
    results
  };
}
function checkPolicy(verification, requirements) {
  return evaluatePolicy(verification, requirements).pass;
}

// src/identity.ts
var PLATFORM_ORDER = ["github", "discord", "farcaster"];
function buildIdentity(data) {
  const sortedProofs = [...data.proofs].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
  );
  const lastVerified = sortedProofs.filter((p) => p.verifiedAt).sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime())[0]?.verifiedAt || null;
  const oldestProof = sortedProofs.filter((p) => p.issuedAt > 0).sort((a, b) => a.issuedAt - b.issuedAt)[0];
  const accountAge = oldestProof ? Math.floor((Date.now() - oldestProof.issuedAt) / (1e3 * 60 * 60 * 24)) : null;
  return {
    wallet: data.wallet,
    trustLevel: data.trustLevel,
    verifiedPlatforms: data.verifiedPlatforms,
    totalVerified: data.totalVerified,
    proofs: sortedProofs,
    chain: data.chain || "rialo-devnet",
    explorerUrl: data.explorerUrl || null,
    identityRoot: data.identityRoot || null,
    accountAge,
    lastVerified
  };
}
function formatIdentity(identity) {
  const lines = [
    `Wallet: ${identity.wallet}`,
    `Trust Level: ${identity.trustLevel}`,
    `Verified Platforms: ${identity.verifiedPlatforms.join(", ") || "none"}`,
    `Total Verified: ${identity.totalVerified}/3`,
    `Chain: ${identity.chain}`
  ];
  if (identity.accountAge !== null) {
    lines.push(`Account Age: ${identity.accountAge} days`);
  }
  if (identity.identityRoot) {
    lines.push(`Identity Root: ${identity.identityRoot}`);
  }
  return lines.join("\n");
}

// src/index.ts
var Rialink = class {
  baseUrl;
  rpcUrl;
  chain;
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "https://rialink.vercel.app";
    this.rpcUrl = config.rpcUrl || "https://devnet.rialo.io:4101";
    this.chain = config.chain || "rialo-devnet";
  }
  /**
   * Fetch wallet verification from the Rialink REST API.
   *
   * @param wallet - Solana wallet address (base58, 32-44 chars)
   * @returns full verification response with proofs and trust level
   */
  async verify(wallet) {
    return fetchVerification(wallet, this.baseUrl);
  }
  /**
   * Get trust level only (lightweight check).
   */
  async getTrustLevel(wallet) {
    const result = await this.verify(wallet);
    return result.trustLevel;
  }
  /**
   * Get full identity state.
   */
  async getIdentity(wallet) {
    const verification = await this.verify(wallet);
    return buildIdentity({
      wallet: verification.wallet,
      trustLevel: verification.trustLevel,
      verifiedPlatforms: verification.verifiedPlatforms,
      totalVerified: verification.totalVerified,
      proofs: verification.proofs,
      chain: verification.chain,
      explorerUrl: verification.explorerUrl
    });
  }
  /**
   * Evaluate policy requirements against a wallet.
   */
  evaluatePolicy(verification, requirements) {
    return evaluatePolicy(verification, requirements);
  }
  /**
   * Quick policy check — returns true/false.
   */
  checkPolicy(verification, requirements) {
    return checkPolicy(verification, requirements);
  }
  /**
   * List verified platforms for a wallet.
   */
  async getPlatforms(wallet) {
    const result = await this.verify(wallet);
    return result.verifiedPlatforms;
  }
  /**
   * Get verification proofs for a specific platform.
   */
  async getProofsForPlatform(wallet, platform) {
    const result = await this.verify(wallet);
    return result.proofs.filter((p) => p.platform === platform);
  }
  /**
   * Check if wallet is anchored on-chain.
   */
  async isAnchored(wallet) {
    const result = await this.verify(wallet);
    return result.anchoredProofs > 0;
  }
  /**
   * Format identity for display.
   */
  formatIdentity(identity) {
    return formatIdentity(identity);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Rialink,
  buildIdentity,
  checkPolicy,
  deriveTrustLevel,
  evaluatePolicy,
  fetchVerification,
  formatIdentity
});
