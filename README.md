# Rialink - Wallet-Linked Identity Attestation on Rialo

Rialink is a Web3 identity attestation dApp that binds a wallet to public social identities (GitHub, Discord, Farcaster), then exposes trust signals for people and apps to consume.

It is built with:
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Upstash Redis (`@upstash/redis`)
- Solana wallet adapter
- Farcaster auth kit

Live app:
- `https://rialink-two.vercel.app`

---

## 1. What Rialink Does

Rialink lets a wallet owner prove:
- "I control this wallet"
- "I also control these social accounts"

without requiring invasive KYC.

Each verified platform creates a deterministic cryptographic proof tied to the wallet. The app then presents that identity as:
- public profile pages
- verifier pages
- a shareable certificate card
- machine-readable APIs for policy gating

---

## 2. Problem It Solves

Wallets are pseudonymous by default. For DAOs, grant programs, bounties, and communities, that creates friction:
- hard to assess credibility quickly
- easy for sybil wallets to appear legitimate
- no standard reusable "identity trust layer" across dApps

Rialink solves this by creating portable wallet-linked trust signals that can be consumed by any app through simple API calls.

---

## 3. Core Product Surfaces

- `/verify`
  - authenticated dashboard for linking identities
- `/verifier?cardId=<card_id>`
  - public wallet lookup (no wallet connection required)
- `/profile/[wallet]`
  - public/read-only profile view
- `/certificate/[wallet]`
  - RialCard (shareable identity score card)
- `/badge/[wallet]`
  - embeddable badge route
- `/developers`
  - integration docs for external dApps

---

## 4. Main API Endpoints

### Identity and Proof APIs
- `GET /api/proof?wallet=<wallet>`
  - internal/full proof rows for app surfaces
- `POST /api/proof`
  - consumes verification session + wallet proof, saves proof
- `DELETE /api/proof`
  - removes a platform proof after wallet proof verification
- `POST /api/verify-proof`
  - trustless verification of signed `binding_proof` token
- `GET /api/verify/[wallet]`
  - public clean response for integrators:
    - trust level
    - verified platforms
    - masked usernames
    - summarized proof hashes

### Policy APIs
- `POST /api/policy/check`
  - evaluates policy requirements for a wallet
  - optionally returns signed `accessToken` when checks pass
- `POST /api/policy/verify`
  - verifies access token signature and expiry

---

## 5. Exact Verification Process (How It Works Today)

This flow is implemented and enforced in server routes and server utilities.

### Step A - Wallet ownership proof
1. Client requests challenge from `GET /api/challenge?wallet=...`.
2. Server issues nonce + issuedAt (short-lived, Redis-backed).
3. Client signs a canonical message:
   - wallet
   - nonce
   - issuedAt
   - domain
4. Server verifies:
   - nonce exists and matches
   - canonical message format is exact
   - signature is valid for wallet public key

### Step B - Social verification session
GitHub and Discord:
- server issues OAuth state token bound to wallet and platform
- callback consumes state once (one-time use)
- callback exchanges provider code for identity
- callback issues short-lived server verification token

Farcaster:
- server verifies Sign In With Farcaster payload and signature
- server checks domain and FID consistency
- server issues short-lived server verification token

### Step C - Proof creation
`POST /api/proof` requires both:
- valid wallet proof
- valid server-issued verification token

If valid, server:
1. consumes verification token (one-time, race-safe)
2. computes deterministic `proofHash` from:
   - wallet + platform + platform user ID
3. creates signed `binding_proof` token
4. stores proof row in Redis
5. updates identity root hash for wallet

### Step D - Public verification
- Public consumers query `GET /api/verify/[wallet]`.
- Optional trustless check of binding token via `POST /api/verify-proof`.

---

## 6. Security Model

Current protections include:
- wallet signature required before proof creation/removal
- canonical wallet message enforcement (prevents hidden-line payload tampering)
- short-lived verification sessions
- one-time token consumption markers
- lock keys to prevent race-condition double-consumption
- wallet-bound and platform-bound verification sessions
- reverse index to prevent one social account linking to multiple wallets
- deterministic proof hash recomputation during proof verification
- HMAC-signed binding proof tokens
- HMAC-signed policy access tokens with expiry checks

---

## 7. Privacy Model

Rialink is built as a low-PII trust layer.

Stored:
- wallet address
- platform
- platform user ID and username
- proof hash
- verification timestamp
- limited public metrics (repos, commits, followers, servers)

Not stored:
- private keys
- wallet seed phrases
- platform passwords
- legal identity documents

Public `/api/verify/[wallet]` response is additionally minimized:
- masked usernames
- shortened proof hashes
- no internal session metadata

---

## 8. Trust Levels

Public trust levels are currently based on number of verified platforms:
- `high`: 3 platforms
- `medium`: 2 platforms
- `low`: 1 platform
- `none`: 0 platforms

---

## 9. Policy Engine and Access Control

`POST /api/policy/check` evaluates requirements such as:
- required platforms
- minimum total platforms
- minimum GitHub repo count
- maximum proof age

Built-in policies:
- `dao-grant`
- `bounty`
- `hackathon`
- `airdrop`
- `custom` (caller-defined requirements)

When checks pass, server issues `vm_...` access token signed with HMAC-SHA256.  
`POST /api/policy/verify` allows downstream apps to validate token authenticity and expiry.

---

## 10. Value for Developers, Builders, and Communities

### Developers
- add identity gating with one API call
- no need to implement OAuth for each platform
- no need to run custom trust-score backend

### Builders
- prove social + builder history tied to wallet
- share profile/verifier/certificate links publicly

### Communities and DAOs
- reduce sybil abuse
- gate grants/bounties/events with objective requirements
- keep onboarding less invasive than full KYC

---

## 11. Practical Use Cases

- DAO grants:
  - require GitHub + Discord before accepting applications
- bounty programs:
  - only allow payouts to verified builder wallets
- hackathons:
  - reduce duplicate/throwaway registrations
- community moderation:
  - grant roles based on verified trust tier
- contributor marketplaces:
  - portable wallet-linked resume

---

## 12. Rialo Integration (Current and Future Architecture)

Rialink currently stores proofs off-chain (Redis) and exposes them via APIs.  
The architecture is intentionally designed so integrator-facing APIs can remain stable while trust moves on-chain over time.

### Current state
- off-chain proof storage in Upstash Redis
- placeholder off-chain tx signatures for proof rows
- identity root computed server-side

### Rialo migration path

#### Phase 1 - Root anchoring
- Anchor wallet `identityRoot` on Rialo.
- Keep app UX and API contracts unchanged.
- Return tx references for auditability.

#### Phase 2 - Per-platform commitments + revocations
- Store per-platform proof commitments (hash leaves) on-chain.
- Add explicit update/revoke operations.
- Preserve historical proof lineage.

#### Phase 3 - On-chain policy attestations
- Option A: off-chain policy evaluation + on-chain attestation hash.
- Option B: deterministic policy evaluation in on-chain program logic.

### Potential contract interface (example)
- `upsert_identity_root(wallet, root, version, metadata_hash)`
- `set_platform_commitment(wallet, platform, leaf_hash, verified_at)`
- `revoke_platform(wallet, platform, reason_code)`
- `get_identity(wallet)`

### Rialo technology alignment
Based on Rialo public materials, Rialink can align with:
- Rialo VM / SVM compatibility:
  - wallet tooling and transaction model continuity
- Reactive execution:
  - automatic policy refresh on state changes
- Workflow and automation:
  - scheduled re-verification and expiry sweeps
- IPC/privacy capabilities:
  - commitment-based proofs with private metadata handling
- data/read-path acceleration:
  - faster query response for high-traffic gating
- gasless UX paths:
  - sponsored proof anchoring for users

---

## 13. Consultant Notes and Scope Signals

What makes this project meaningful:
- clear real-world utility (grant gating, bounty integrity, community trust)
- privacy-preserving alternative to heavy KYC workflows
- API-first design that external dApps can adopt quickly
- migration-ready architecture from off-chain to on-chain trust anchoring

What to evaluate before scale-up:
- rate limiting and abuse controls for public APIs
- explicit SLOs for proof freshness and revocation latency
- key management and rotation for signing secrets
- indexer strategy for on-chain read performance
- backward compatibility guarantees for API versions

---

## 14. Environment Variables

Key variables used in this codebase:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `FARCASTER_RPC_URL`
- `NEXT_PUBLIC_FARCASTER_RELAY_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_RIALO_RPC_URL`
- `NEXT_PUBLIC_RIALO_EXPLORER_URL`
- `POLICY_SIGNING_SECRET`
- `PROOF_SIGNING_SECRET`
- `PROOF_SECRET`
- `POLICY_TOKEN_TTL_SECONDS`

---

## 15. Local Development

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

