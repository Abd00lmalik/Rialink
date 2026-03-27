# VerifyMe on Rialo

Live demo: https://verifyme-two.vercel.app

## What VerifyMe does
VerifyMe lets builders prove they control GitHub, Discord, and Farcaster accounts from a wallet address without KYC.
We store proofs as hashes (receipts), not emails or real names.

## Demo flow (2 minutes)
1. Open /profile/demo (shows the end state)
2. Open /verify and connect a wallet
3. Verify GitHub, Discord, and Farcaster
4. Open /certificate/<wallet> (VM Card)
5. Share the VM Card link on X (uses OpenGraph image preview)

## What is working today (off-chain)
- Wallet connect + verification dashboard
- GitHub OAuth callback fetches avatar + public repo count + commit estimate
- Discord OAuth callback fetches avatar + account creation date + server count
- Farcaster verification fetches avatar + follower count
- Proof persistence via Upstash Redis (KV)
- Public profile page + embeddable badge
- VM Card + OpenGraph image

## What is left before we claim "on-chain"
- Switch proof hash to a real cryptographic hash (SHA-256) and freeze a v1 spec
- Clean remaining mojibake (bad characters) in UI copy
- Stats endpoint should read from KV instead of an in-memory mock store

## Rialo integration plan (what we need dev access for)
Phase 1 (anchor):
- Compute a VM Identity Root hash from the 1-3 platform proof hashes
- Write the root hash to a Rialo contract keyed by wallet (plus timestamp)
- Read it back in the UI and show an "Anchored" badge

Phase 2 (unique Rialo feature):
- Use Rialo web connectivity + async workflow to verify a public challenge on-chain:
  - GitHub Gist or Farcaster cast contains: verifyme:<wallet>:<nonce>
  - Contract fetches URL, validates challenge, writes proof hashes/root
- No backend required for verification

Phase 3 (reactive):
- Reactive checks re-validate proofs on trigger
- Auto-revoke if the public challenge disappears (optional)

## What we need from the Rialo team
- Devnet/testnet RPC endpoint and explorer base URL
- Smart contract templates/examples for storing small commitments (hashes)
- Docs for web calls, async workflow, and reactive triggers
- Guidance for key management and rate limits
