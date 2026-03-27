# VerifyMe — Decentralized Social Proof Registry on Rialo

VerifyMe lets anyone prove they control GitHub, Discord, and Farcaster accounts from a Solana-compatible wallet without exposing personal data. The app stores privacy-preserving proof hashes and shows a verifier page, badge, and VM Card.

Current state: proof storage is off-chain (Upstash Redis) with a placeholder transaction signature so the UI is ready for Rialo on-chain writes once devnet access is granted.

## What the dApp does
- Connects a Solana-compatible wallet (Phantom, Solflare)
- Requires a wallet signature to prove ownership before any proof is saved
- Verifies GitHub and Discord using OAuth
- Verifies Farcaster using Sign In With Farcaster and server-side signature verification
- Generates privacy-preserving proof hashes instead of storing usernames or IDs
- Provides a policy engine and access tokens for gating (airdrop, DAO, bounty)
- Displays a verifier page, embeddable badge, and VM Card for the wallet

## Where Rialo fits (now and later)
Now (off-chain)
- Proofs are saved in Redis through a single storage layer
- A placeholder tx signature is shown in the UI

When Rialo devnet is available
- The same storage layer will write proofs and an identity root to a Rialo contract
- The tx signature will be a real Rialo transaction hash

Rialo Edge (unique feature)
- Smart contracts can make native HTTPS calls
- The contract can fetch GitHub/Discord/Farcaster data directly on-chain
- This removes the backend entirely and makes verification fully trustless

## Why this is useful
For users
- Prove you control real social accounts without doxxing yourself
- Share a single verifier link or VM Card that aggregates your proofs

For DAOs and communities
- Verify a wallet owns real accounts without collecting personal data
- Use proof hashes and the identity root to match wallets to verified accounts
- Gate access by policy (airdrop, DAO membership, bounty submissions)

## Use cases (examples)
- Sybil-resistant airdrops: require 2+ verified platforms
- DAO membership gating: require GitHub + Farcaster
- Hiring and grants: confirm a wallet belongs to a real builder
- Bounty submissions: require verified GitHub
- Community moderation: flag wallets with no verified proofs

## How a user proves ownership (end-to-end)
1. User connects a wallet.
2. User signs a one-time message to prove wallet ownership.
3. User verifies GitHub/Discord (OAuth) or Farcaster (sign-in).
4. The server computes a proof hash and returns masked identity data.
5. Proofs are saved and displayed on the verifier page, badge, and VM Card.

## How a user shares their proofs
Option 1: Share a verifier link (official)
- `/verifier?wallet=<wallet>` shows verified platforms, proof hashes, and identity root

Option 2: Share a VM Card (best for non-technical people)
- `/certificate/<wallet>` summarizes proofs and scores

Option 3: Share proof hashes directly
- The proof hash is shown in each verified card and can be copied
- Users can also share the identity root (see API below)
- Each proof also has a short Share Code derived from the proof hash for quick cross-checks

Option 4: Share a public profile (visual only)
- `/profile/<wallet>` is a read-only view intended for humans

## Policy engine and access tokens
The policy engine evaluates whether a wallet meets a rule set and issues a short-lived access token when eligible.

Example policies
- Airdrop: minPlatforms = 2
- DAO gate: requirePlatforms = ["github", "farcaster"]
- Bounty: requirePlatforms = ["github"]

Third-party apps call `/api/policy/check` and receive an `accessToken` if eligible. The token can be verified later using `/api/policy/verify`.

## How DAOs or third parties verify
Option 1: Use the verifier page (fastest)
- Open `/verifier?wallet=<wallet>` to auto-check proofs + identity root

Option 2: Use the policy engine (recommended for gating)
- `POST /api/policy/check` returns eligibility and a short-lived access token
- `POST /api/policy/verify` confirms the token is valid

Option 3: Use the API (recommended for automation)
- `GET /api/proof?wallet=<wallet>` returns:
  - proofs
  - identityRoot
  - cardId

Option 4: Use the public profile (visual only)
- `/profile/<wallet>` is not enough on its own and should be paired with the verifier page or API

A DAO can store the proof hashes or identityRoot and verify that a wallet has the required verified accounts without collecting personal data.

## Proof model
- Proof Hash = hash(walletAddress + platformUserId)
- Username Hash = hash(platform + username)
- Masked username is displayed in the UI (not the full username)
- Identity Root is computed from the set of proof hashes

## What data is stored
Stored per proof
- proofHash
- usernameHash
- maskedUsername
- platform metadata (repo count, follower count, account created date)
- verifiedAt timestamp
- txSignature (currently off-chain placeholder)

Not stored
- Full social usernames
- Emails
- Real names

## API endpoints (current)
- `GET /api/proof?wallet=<wallet>`
  - Returns proofs, identityRoot, cardId
- `POST /api/proof`
  - Saves a proof (requires walletProof)
- `DELETE /api/proof`
  - Removes a proof (requires walletProof)
- `POST /api/farcaster`
  - Verifies Farcaster signature and returns proof hash data
- `POST /api/policy/check`
  - Evaluates a policy and issues an access token if eligible
- `POST /api/policy/verify`
  - Verifies the access token

## UI routes
- `/verify` verification dashboard
- `/verifier` public verification page
- `/profile/<wallet>` public profile (visual only)
- `/badge/<wallet>` embeddable badge
- `/certificate/<wallet>` VM Card
- `/card/<cardId>` shareable card page

## Environment variables
Required
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `FARCASTER_RPC_URL` (Ethereum RPC for signature verification)
- `POLICY_SIGNING_SECRET` (used to sign access tokens)

Recommended
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_RIALO_RPC_URL`
- `NEXT_PUBLIC_RIALO_EXPLORER_URL`
- `NEXT_PUBLIC_FARCASTER_RELAY_URL`
- `POLICY_TOKEN_TTL_SECONDS` (default 600)

## Local development
```bash
npm install
cp .env.local.example .env.local
# Fill in OAuth + Redis values
npm run dev
```
Visit[ https://verifyme-two.vercel.app ]

## Rialo integration status
Ready to swap storage to on-chain when devnet access is granted.
- Storage layer already routes proof writes through a single module
- UI already displays a tx signature (placeholder now)

When Rialo is available, the storage layer will write to a contract and store the real tx signature instead of the placeholder.
