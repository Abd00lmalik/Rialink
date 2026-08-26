# Rialink Implementation Plan

> Living document. Updated as features ship.
> Last updated: 2026-08-26

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Playground Apps                      │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ @rialo/  │  │ embed.js │  │  Identity          │  │
│  │ rialink  │  │ widget   │  │  composability     │  │
│  │ sdk      │  │          │  │  layer             │  │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
│       │              │                 │              │
│       ▼              ▼                 ▼              │
│  ┌─────────────────────────────────────────────┐     │
│  │           Rialink API Layer                  │     │
│  │  /api/verify  /api/identity  /api/webhooks   │     │
│  └──────────────────┬──────────────────────────┘     │
│                     │                                 │
│       ┌─────────────┼─────────────┐                  │
│       ▼             ▼             ▼                  │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Redis  │  │  Rialo   │  │  Anchor  │            │
│  │  proofs │  │  chain   │  │  wallet  │            │
│  └─────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────┘
```

## Feature Roadmap

### Feature 1: On-Chain Identity Verifier `lib/rialo-verify.ts`
**Status:** DONE
**Effort:** 2-3 days
**Priority:** 1 (foundation for everything)

Reads identity memos from Rialo chain and computes trust level without calling Rialink API.

**Files to create:**
- `lib/rialo-verify.ts` — server-side: fetch txs, decode memos, compute trust
- `lib/rialo-verify-client.ts` — client-side: same logic via public RPC

**Functions:**
- `getAnchorTransactions(wallet)` — fetches memo txs from anchor address, filters by wallet
- `decodeMemo(tx)` — base58 → UTF-8 → parse `rialink:v1|action|wallet|root`
- `computeTrustLevel(proofs)` — maps verified count to none/low/medium/high
- `verifyOnChain(wallet)` — full pipeline

**Success criteria:**
- [x] `verifyOnChain("wallet")` returns same trust level as Redis-based verify
- [x] Works without any Rialink API key or session
- [x] Response time < 2s on devnet
- [x] Unit tests pass

---

### Feature 2: `@rialink/sdk` npm Package
**Status:** DONE
**Effort:** 1-2 days
**Priority:** 2 (unlocks all integrations)

Typed JavaScript/TypeScript SDK for Rialink.

**Files to create:**
- `sdk/package.json`
- `sdk/src/index.ts` — exports `Rialink` class
- `sdk/src/types.ts` — TypeScript types
- `sdk/src/verify.ts` — verify logic
- `sdk/src/policy.ts` — policy check logic
- `sdk/src/identity.ts` — identity composability

**Methods:**
- `new Rialink(baseUrl?)` — constructor
- `verify(wallet)` — returns identity + trust level
- `checkPolicy(wallet, requirements)` — evaluate policy
- `getIdentity(wallet)` — full identity state
- `verifyOnChain(wallet)` — chain-based verification

**Success criteria:**
- [x] `npm install @rialink/sdk` works
- [x] Typed (TypeScript declarations)
- [x] Tree-shakeable, < 5KB minified
- [x] Works in Node 18+, Deno, Bun, browser
- [x] README with usage examples

---

### Feature 3: Composability Layer
**Status:** DONE
**Effort:** 1 day
**Priority:** 3 (other protocols need this)

Other Rialo protocols can read a wallet's Rialink identity.

**Files to create:**
- `app/api/identity/[wallet]/route.ts` — GET endpoint
- `lib/identity-schema.ts` — public identity types
- `lib/identity-builder.ts` — builds identity from proofs

**Success criteria:**
- [x] `GET /api/identity/:wallet` returns structured identity JSON
- [x] Includes: trust level, platforms, proofs, repo count, account ages, anchor receipts
- [x] CORS allows cross-origin reads
- [x] Schema documented and versioned
- [x] Response < 500ms

---

### Feature 4: Wallet-Native Verification Flow
**Status:** DONE
**Effort:** 2 days
**Priority:** 4 (best playground UX)

Users verify directly with their connected wallet — no OAuth redirects.

**Files to create:**
- `app/api/challenge/wallet-native/route.ts` — issue challenge
- `app/api/verify/wallet-native/route.ts` — verify signature
- `lib/wallet-native.ts` — challenge/signature logic
- `components/verification/WalletNativeVerify.tsx` — UI component

**Flow:**
1. User clicks "Verify with wallet"
2. API returns a Solana message to sign
3. User signs with connected wallet (Phantom/Solflare)
4. API verifies signature, links identity
5. Verification appears in `/verify` page

**Success criteria:**
- [x] User signs one message → identity linked
- [x] No page redirect, no OAuth
- [x] Works in Phantom, Solflare, Backpack
- [x] Verification appears in `/verify` page

---

### Feature 5: Embeddable Widget
**Status:** DONE
**Effort:** 1-2 days
**Priority:** 5 (instant distribution)

Script tag any website can drop in to show verification badge.

**Files to create:**
- `app/embed.js/route.ts` — serves self-contained widget script
- `lib/embed-widget.ts` — widget logic (vanilla JS)
- `public/embed.js` — static widget script

**Success criteria:**
- [x] `<script src="rialink.vercel.app/embed.js">` renders a badge
- [x] Badge shows platform icons, verified count, trust level
- [x] Dark/light theme support
- [x] No dependencies (vanilla JS + inline SVG)
- [x] Works in any HTML page

---

### Feature 6: Webhook Notifications
**Status:** DONE
**Effort:** 2-3 days
**Priority:** 6 (real-time integrations)

Notify subscribed apps when verification status changes.

**Files to create:**
- `app/api/webhooks/route.ts` — CRUD for webhook registrations
- `lib/webhook-dispatcher.ts` — sends webhooks on proof changes
- `lib/webhook-signing.ts` — HMAC signature for security

**Success criteria:**
- [x] Register a webhook, verify a wallet, receive POST within 5s
- [x] HMAC signature verifiable with shared secret
- [x] Delivery retries on failure (3 attempts)
- [x] Max 10 webhooks per wallet

---

### Feature 7: Cross-App Reputation
**Status:** NOT STARTED
**Effort:** 3-4 days
**Priority:** 7 (network effects)

Reputation signals from Rialo dApps feed back into Rialink identity.

**Files to create:**
- `app/api/identity/[wallet]/reputation/route.ts` — POST signal, GET aggregated
- `lib/reputation-store.ts` — Redis storage for signals
- `lib/reputation-score.ts` — score algorithm

**Success criteria:**
- [ ] DApp submits reputation signal for a wallet
- [ ] Reputation score returned in identity endpoint
- [ ] Signals expire after 90 days (configurable)
- [ ] At least 3 playground apps submitting signals in pilot

---

## Build Order

```
Week 1: Feature 1 (on-chain verifier) → Feature 2 (SDK)
Week 2: Feature 3 (composability) → Feature 4 (wallet-native)
Week 3: Feature 5 (widget) → Feature 6 (webhooks)
Week 4: Feature 7 (reputation) → Integration testing
```

## Current State (2026-08-26)

- [x] Rialink core (verify, proofs, badges)
- [x] Rialo anchoring on devnet
- [x] Developers page rebuilt
- [x] Feature 1: On-chain verifier (lib/rialo-verify.ts)
- [x] Feature 2: @rialink/sdk npm package (sdk/)
- [x] Feature 3: Composability layer (app/api/identity/:wallet)
- [x] Feature 4: Wallet-native verification (challenge + verify endpoints)
- [x] Feature 5: Embeddable widget (public/embed.js)
- [x] Feature 6: Webhook notifications (CRUD + dispatcher)
- [ ] Feature 7: Cross-app reputation — NOT STARTED
