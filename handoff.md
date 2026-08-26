# Rialink — Agent Handoff

> This file helps any agent pick up where the last one left off.
> Read this first, then `implementation.md` for the full plan.

## Project Status

**Rialink** — Decentralized identity on Rialo. Wallets bind GitHub, Discord, Farcaster. Proofs anchored on-chain.

**Repo:** `C:\Users\USER\AppData\Local\Temp\opencode\rialink` (branch: `main`)
**Live:** `https://rialink.vercel.app`
**Chain:** Rialo Devnet (`https://devnet.rialo.io:4101`)
**Explorer:** `https://devnet.rialoscan.org`

## What's Built

### Core product (DONE)
- Wallet connection (Solana adapter, Phantom/Solflare)
- GitHub/Discord OAuth verification
- Farcaster sign-in verification
- Proof creation, storage, revocation
- RialCard (certificate page)
- Public badge (`/badge/:wallet`)
- Verifier page (`/verifier`)
- Profile page (`/profile/:wallet`)

### Rialo anchoring (DONE)
- Anchor wallet: `6b96D9tmtkrx2i4nc5tiaLr5pLbne4wenv3iTYe3Bp6r` (funded, 1 RLO)
- Anchor secret saved at: `C:\Users\USER\temp\opencode\anchor-devnet-wallet.txt`
- Memo format: `rialink:v1|<action>|<wallet>|<identityRoot>`
- Selftest: PASS on devnet
- Health endpoint shows `anchorDetail.configured` when env vars set

### Landing page (DONE)
- Quiet-luxury 60/30/10 design system
- Cursor glyph reveal (Rialo mark)
- Zigzag proof trace
- Instrument Serif headline
- Official Discord/Farcaster SVG icons

### Verify page (DONE)
- One-mint-button state machine
- Identity rail with segment progress
- Platform cards with receipts
- Public badge preview
- Accent mint tokens (no green)

### Developers page (DONE)
- Three integration paths (REST, SDK, React hooks)
- Live API playground
- On-chain receipts docs
- Policy engine docs
- Embeddable widget docs
- Full API reference (7 endpoints)

## What's Built (Features 1-6)

### Feature 1: On-chain verifier (DONE)
- `lib/rialo-verify.ts` — reads memo txs from Rialo chain, decodes identity roots
- `scripts/verify-onchain-test.mjs` — test script confirmed working on devnet
- Functions: `verifyOnChain()`, `getTrustLevel()`, `decodeAnchorMemo()`
- Verified: fetches anchor wallet txs, filters by target wallet, decodes memos

### Feature 2: @rialink/sdk (DONE)
- `sdk/` — typed npm package, builds to CJS + ESM + .d.ts
- Methods: `verify()`, `getIdentity()`, `checkPolicy()`, `evaluatePolicy()`, `getTrustLevel()`, `getPlatforms()`, `isAnchored()`
- Package size: ~7KB minified
- Install: `npm install @rialink/sdk`

### Feature 3: Composability layer (DONE)
- `app/api/identity/[wallet]/route.ts` — GET returns `rialink.identity.v1` schema
- Returns: trust level, platforms, proofs, identity root, account age, chain, explorer URL
- CORS enabled for cross-origin reads

### Feature 4: Wallet-native verification (DONE)
- `app/api/challenge/wallet-native/route.ts` — POST issues Solana message to sign
- `app/api/verify/wallet-native/route.ts` — POST verifies signature, links identity
- Flow: sign challenge → verify → identity linked

### Feature 5: Embeddable widget (DONE)
- `public/embed.js` — vanilla JS, no dependencies, dark/light themes
- `app/embed.js/route.ts` — serves widget with CORS headers
- Usage: `<div class="rialink-badge" data-wallet="address" data-theme="dark"></div>`
- Auto-initializes, MutationObserver for dynamic DOM

### Feature 6: Webhook notifications (DONE)
- `app/api/webhooks/route.ts` — CRUD (GET/POST/DELETE)
- `lib/server/webhook-dispatcher.ts` — dispatch + 3 retries with backoff
- `lib/server/webhook-signing.ts` — HMAC-SHA256 signing + verification
- Events: `proof.created`, `proof.revoked`, `identity.updated`
- Max 10 webhooks per wallet

### Feature 7: Cross-app reputation (DONE)
- `lib/reputation-store.ts` — Redis storage for signals, 90-day TTL, weighted decay scoring
- `app/api/identity/[wallet]/reputation/route.ts` — POST signal + GET aggregate
- Schema: `rialink.reputation.v1`
- Score: -100 to 100, weighted by recency
- Signals expire after 90 days
- Reputation included in identity endpoint when available

### Webhooks wired into proof flow (DONE)
- `lib/server/proof-storage.ts` — `saveProof()` dispatches `proof.created`, `deleteProof()` dispatches `proof.revoked`
- Fire-and-forget, non-blocking

### Developers page updated (DONE)
- New sections: Identity Composability, Wallet-Native, Webhooks, Reputation, On-Chain Verifier
- API reference table updated from 7 to 15 endpoints
- Code snippets for all new features

## Key Architecture Decisions

- **Chain:** Rialo Devnet (will migrate to testnet later)
- **SDK chain:** `RIALO_DEVNET_CHAIN` from `@rialo/ts-cdk`
- **Anchor chain ID:** `rialo-devnet`
- **Explorer:** `https://devnet.rialoscan.org`
- **Verify page:** One-mint-button rule (never two filled accent buttons)
- **Badge:** Uses accent mint, not green
- **Design:** 60/30/10 quiet-luxury tokens

## Environment Variables (Vercel)

Required for anchoring:
```
RIALINK_ANCHOR_SECRET=FzTFbMYj349A7fY9dPnE1McAYKHh7WnEoSowG1uKfPuE
RIALO_RPC_URL=https://devnet.rialo.io:4101
NEXT_PUBLIC_RIALO_EXPLORER_URL=https://devnet.rialoscan.org
```

## File Structure

```
rialink/
├── app/
│   ├── verify/page.tsx              # Verify dashboard (one-mint-button)
│   ├── developers/page.tsx          # Dev docs + playground
│   ├── embed.js/route.ts            # Serves embed widget
│   ├── api/
│   │   ├── verify/
│   │   │   ├── [wallet]/route.ts    # Public verification lookup
│   │   │   └── wallet-native/       # POST verify wallet-native signature
│   │   ├── identity/[wallet]/       # GET composability endpoint
│   │   ├── proof/                   # Proof CRUD
│   │   ├── challenge/
│   │   │   ├── route.ts             # Wallet ownership challenge
│   │   │   └── wallet-native/       # POST wallet-native challenge
│   │   ├── webhooks/route.ts        # GET/POST/DELETE webhook CRUD
│   │   ├── github/                  # GitHub OAuth
│   │   ├── discord/                 # Discord OAuth
│   │   ├── farcaster/               # Farcaster verify
│   │   ├── policy/                  # Policy engine
│   │   ├── health/                  # Health check
│   │   └── stats/                   # Network stats
│   └── globals.css                  # 60/30/10 tokens
├── components/
│   ├── verification/
│   │   ├── VerificationCard.tsx      # Platform card (mintIdx prop)
│   │   ├── PlatformGrid.tsx          # Card list
│   │   ├── ProofBadge.tsx            # Public badge
│   │   └── FarcasterSignIn.tsx       # Farcaster auth-kit wrapper
│   ├── landing/
│   │   ├── Hero.tsx                  # Hero + RialCard
│   │   ├── CursorReveal.tsx          # Glyph reveal + torch
│   │   ├── ProofTrace.tsx            # Zigzag process
│   │   └── ...
│   └── ui/
│       ├── Badge.tsx                 # Status badge (accent mint)
│       └── ...
├── lib/
│   ├── rialo-verify.ts              # Feature 1: on-chain verifier
│   ├── reputation-store.ts          # Feature 7: cross-app reputation
│   ├── server/
│   │   ├── rialo-anchor.ts           # Anchor: memo tx + balance
│   │   ├── proof-storage.ts          # Redis proof CRUD + webhook dispatch
│   │   ├── webhook-signing.ts        # Feature 6: HMAC signing
│   │   ├── webhook-dispatcher.ts     # Feature 6: dispatch + retries
│   │   └── ...
│   ├── types.ts                      # Platform, VerificationState
│   ├── constants.ts                  # PLATFORM_CONFIG, EXPLORER_URL
│   └── utils.ts                      # truncateAddress, formatDate
├── hooks/
│   ├── useVerifications.ts           # Fetch proofs
│   ├── useWalletProof.ts             # Wallet ownership proof
│   └── useToast.ts                   # Toast notifications
├── sdk/                              # Feature 2: @rialink/sdk npm package
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # Rialink class
│   │   ├── types.ts                  # TypeScript types
│   │   ├── verify.ts                 # Verify logic
│   │   ├── policy.ts                 # Policy check logic
│   │   └── identity.ts              # Identity composability
│   └── dist/                         # Built output (CJS + ESM + .d.ts)
├── public/
│   └── embed.js                      # Feature 5: embeddable widget
├── scripts/
│   ├── anchor-keygen.mjs             # Generate anchor wallet
│   ├── anchor-selftest.mjs           # End-to-end anchor test
│   └── verify-onchain-test.mjs       # Feature 1: on-chain test
├── implementation.md                 # Full implementation plan
└── handoff.md                        # This file
```

## Notes for Next Agent

1. Read `implementation.md` for the full feature plan — ALL 7 FEATURES COMPLETE
2. All new API routes go in `app/api/`
3. Use existing tokens from `globals.css` — do not introduce new colors
4. The anchor wallet is funded on devnet — do not regenerate
5. `@rialo/ts-cdk` must be in `serverComponentsExternalPackages` in `next.config.js`
6. The verify page has a one-mint-button state machine — respect it
7. Run `npx next build` before committing
8. Git author: `Abdulmalik Abdulrashid <abdulmalikabdulrashid1@gmail.com>`
9. SDK builds: `cd sdk && npm run build`
10. Vercel env vars still needed for anchoring: `RIALINK_ANCHOR_SECRET`, `RIALO_RPC_URL`, `NEXT_PUBLIC_RIALO_EXPLORER_URL`
