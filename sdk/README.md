# @rialink/sdk

TypeScript SDK for Rialink — decentralized identity on Rialo.

## Install

```bash
npm install @rialink/sdk
```

## Quick Start

```ts
import { Rialink } from "@rialink/sdk";

const rialink = new Rialink();

// Verify a wallet
const result = await rialink.verify("wallet_address");
console.log(result.trustLevel); // "high" | "medium" | "low" | "none"

// Get identity
const identity = await rialink.getIdentity("wallet_address");
console.log(identity.verifiedPlatforms); // ["github", "discord", "farcaster"]

// Check policy
const pass = rialink.checkPolicy(result, [
  { platform: "github", minRepos: 5 },
  { trustLevel: "medium" },
]);
```

## API

### `new Rialink(config?)`

| Option | Default | Description |
|--------|---------|-------------|
| `baseUrl` | `https://rialink.vercel.app` | Rialink API URL |
| `rpcUrl` | `https://devnet.rialo.io:4101` | Rialo RPC URL |
| `chain` | `rialo-devnet` | Chain identifier |

### `verify(wallet)`

Returns full verification response with proofs and trust level.

### `getIdentity(wallet)`

Returns structured identity state with account age, last verified, and identity root.

### `checkPolicy(verification, requirements)`

Evaluate policy requirements. Returns `true` if all requirements pass.

### `getTrustLevel(wallet)`

Lightweight trust level check — returns `"high"` | `"medium"` | `"low"` | `"none"`.

### `getPlatforms(wallet)`

List verified platforms for a wallet.

### `isAnchored(wallet)`

Check if wallet has on-chain anchor proofs.

## Policy Requirements

```ts
const pass = rialink.checkPolicy(result, [
  { platform: "github", minRepos: 10 },
  { platform: "github", minFollowers: 100 },
  { trustLevel: "medium" },
  { requiresAnchored: true },
]);
```

| Field | Type | Description |
|-------|------|-------------|
| `platform` | `"github" \| "discord" \| "farcaster"` | Platform to check |
| `minRepos` | `number` | Minimum repo count |
| `minFollowers` | `number` | Minimum follower count |
| `minAccountAgeDays` | `number` | Minimum account age in days |
| `requiresAnchored` | `boolean` | Must be anchored on-chain |
| `trustLevel` | `TrustLevel` | Minimum trust level |

## License

MIT
