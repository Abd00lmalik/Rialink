# VerifyMe — Decentralized Social Proof Registry on Rialo

VerifyMe lets anyone prove they control GitHub, Discord, and Farcaster accounts from a Solana-compatible wallet without exposing personal data. The app stores privacy-preserving proof hashes and shows a public profile, badge, and VM Card.

Current state: proof storage is off-chain (Upstash Redis) with a placeholder transaction signature so the UI is ready for Rialo on-chain writes once devnet access is granted.

## What the dApp does
- Connects a Solana-compatible wallet (Phantom, Solflare)
- Requires a wallet signature to prove ownership before any proof is saved
- Verifies GitHub and Discord using OAuth
- Verifies Farcaster using Sign In With Farcaster and server-side signature verification
- Generates privacy-preserving proof hashes instead of storing usernames or IDs
- Displays a public profile, embeddable badge, and VM Card for the wallet

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
- Share a single profile or VM Card that aggregates your proofs

For DAOs and communities
- Verify a wallet owns real accounts without collecting personal data
- Use proof hashes and the identity root to match wallets to verified accounts

## Use cases (examples)
- DAO membership: require a wallet to prove GitHub + Farcaster before granting roles
- Bounty programs: only accept submissions from wallets that verified GitHub
- Community onboarding: verify Discord ownership without storing usernames
- Reputation: share a VM Card link as a portable, privacy-safe identity

## How a user proves ownership (end-to-end)
1. User connects a wallet.
2. User signs a one-time message to prove wallet ownership.
3. User verifies GitHub/Discord (OAuth) or Farcaster (sign-in).
4. The server computes a proof hash and returns masked identity data.
5. Proofs are saved and displayed on the profile, badge, and VM Card.

## How a user shares their proofs
Option 1: Share a public profile
- `/profile/<wallet>` shows verified platforms and proof hashes

Option 2: Share a VM Card (best for non-technical people)
- `/certificate/<wallet>` summarizes proofs and scores

Option 3: Share proof hashes directly
- The proof hash is shown in each verified card and can be copied
- Users can also share the identity root (see API below)
- Each proof also has a short Share Code derived from the proof hash for quick cross-checks

Option 4: Share a verifier link
- `/verifier?wallet=<wallet>` opens a public checker for third parties

## How DAOs or third parties verify
Option 1: Use the verifier page (fastest)
- Open `/verifier?wallet=<wallet>` to auto-check proofs + identity root

Option 2: Use the public profile (human check)
- Open `/profile/<wallet>` and confirm the verified platforms

Option 3: Use the API (recommended for automation)
- `GET /api/proof?wallet=<wallet>` returns:
  - proofs
  - identityRoot
  - cardId

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

## UI routes
- `/verify` verification dashboard
- `/profile/<wallet>` public profile
- `/badge/<wallet>` embeddable badge
- `/certificate/<wallet>` VM Card
- `/card/<cardId>` shareable card page
- `/verifier` public verification page

## Environment variables
Required
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `FARCASTER_RPC_URL` (Ethereum RPC for signature verification)

Recommended
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_RIALO_RPC_URL`
- `NEXT_PUBLIC_RIALO_EXPLORER_URL`
- `NEXT_PUBLIC_FARCASTER_RELAY_URL`

## Local development
```bash
npm install
cp .env.local.example .env.local
# Fill in OAuth + Redis values
npm run dev
```
Visit http://localhost:3000

## Rialo integration status
Ready to swap storage to on-chain when devnet access is granted.
- Storage layer already routes proof writes through a single module
- UI already displays a tx signature (placeholder now)

When Rialo is available, the storage layer will write to a contract and store the real tx signature instead of the placeholder.
