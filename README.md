# VerifyMe - Social Verification for Wallets on Rialo

VerifyMe helps a wallet owner prove control of real social accounts (GitHub, Discord, Farcaster) without exposing private personal data.

The product is intentionally simple:
- verify social ownership from a wallet
- share a public verifier link
- run an eligibility check for gated access (airdrop, DAO, bounty)

## Current product flow
1. User connects a wallet.
2. User signs a wallet message (ownership proof).
3. User verifies one or more social platforms.
4. Verifier page shows platform status (verified or not verified).
5. A policy check returns eligible or not eligible.
6. If eligible, the app issues a short-lived access pass token.

## Why this matters
- users get portable trust without KYC
- DAOs and apps can gate access by proof policy
- communities can reduce sybil and spam wallets

## Share and verification surfaces
- `/verify` - user verification dashboard
- `/verifier?wallet=<wallet>` - public wallet check page
- `/certificate/<wallet>` - VM Card for simple sharing
- `/profile/<wallet>` - read-only visual profile
- `/badge/<wallet>` - embeddable visual badge

## Policy engine
The policy engine evaluates whether a wallet meets a rule set.

Built-in policy presets:
- airdrop: at least 2 verified platforms
- dao: requires GitHub and Farcaster
- bounty: requires GitHub
- moderation: at least 1 verified platform

API:
- `POST /api/policy/check` - evaluate policy and issue access token if eligible
- `POST /api/policy/verify` - validate an issued access token

## Security model
- wallet signature required before saving proofs
- Farcaster signatures verified server-side
- access tokens are HMAC signed using `POLICY_SIGNING_SECRET`
- token expiry enforced using `POLICY_TOKEN_TTL_SECONDS`

## Data model (privacy-focused)
Stored:
- proof hash per platform
- masked username
- lightweight platform metadata
- verification timestamp

Not stored:
- full legal identity
- email addresses
- private wallet keys

## Rialo integration status
Current storage is off-chain (Redis) through a dedicated storage layer.

When Rialo devnet is available:
- replace storage adapter to write proofs on-chain
- replace placeholder tx signatures with real Rialo tx signatures
- keep the same product flow for users and third parties

## Environment variables
Required:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `FARCASTER_RPC_URL`
- `POLICY_SIGNING_SECRET`

Recommended:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_RIALO_RPC_URL`
- `NEXT_PUBLIC_RIALO_EXPLORER_URL`
- `NEXT_PUBLIC_FARCASTER_RELAY_URL`
- `POLICY_TOKEN_TTL_SECONDS` (default `600`)

## Local development
```bash
npm install
cp .env.local.example .env.local
npm run dev
```
