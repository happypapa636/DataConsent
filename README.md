# DataConsent

DataConsent is a privacy-first consent registry for Midnight. It lets a data owner approve, reject, and revoke narrowly scoped permission requests while organizations prove that access is authorized, purpose-limited, unexpired, and still active.

The chain stores commitments, codes, timestamps, statuses, and privacy-safe access receipts. Raw names, personal records, private keys, and application data remain off-chain. The app is a consent verification layer, not a replacement for an organization’s encrypted data store or legal retention process.

## What is included

- Compact smart contract with organization, request, consent, revocation, and access-receipt registries.
- ZK identity commitments for the authority, organizations, and data owners.
- Owner-proven grant, reject, and revoke circuits.
- Organization authorization and revocation controlled by the authority.
- Hard verification circuit plus non-asserting audit checks with on-chain results.
- React and Vite browser DApp with Lace connector support, preprod configuration, responsive navigation, accessible empty/loading/error states, dark/light themes, and reduced-motion support.
- Browser-persistent private state and signing keys scoped to the wallet account.
- Node-based lifecycle E2E test covering positive and negative paths.

## Architecture

```text
React/Vite + Lace wallet
        |
        | DApp Connector API 4.0.1
        v
Midnight.js providers
  |       |        |       |
  |       |        |       +-- Lace balances and submits transactions
  |       |        +---------- Local proof server on port 6300
  |       +------------------- Preprod GraphQL indexer
  +--------------------------- Browser private state and ZK assets
        |
        v
DataConsent Compact contract on Midnight preprod
```

## Contract behavior

The contract exposes these circuits:

| Circuit | Purpose |
| --- | --- |
| deployment constructor | Binds the authority commitment once to the deploying wallet identity. |
| `registerOrganization` | Register a named organization and its identity commitment. |
| `authorizeOrganization` / `revokeOrganization` | Authority-managed organization lifecycle. |
| `createConsentRequest` | Create a purpose, data-category, duration, sharing, and owner-targeted request. |
| `cancelConsentRequest` | Cancel an open request by its organization. |
| `rejectConsentRequest` | Reject an open request with the requested owner’s private witness. |
| `grantConsent` | Grant an open request with the requested owner’s private witness and expiry. |
| `revokeConsent` | Revoke an active consent with the owner’s private witness. |
| `verifyConsent` | Hard ZK access gate for organizations. |
| `checkConsent` | Record valid or rejected access evidence without failing the transaction. |

The current UI role switcher is a workspace view over the connected identity. It does not impersonate another wallet. The contract remains the final authority and rejects calls made by the wrong commitment.

## Requirements

- Node.js 22 or newer.
- Docker Desktop for the local Midnight node, indexer, and proof server.
- A Midnight Lace Chrome or Edge extension wallet set to Preprod.
- A funded Preprod wallet and generated tDUST for transactions.
- Vercel CLI only when deploying from the command line.

## Install and build

```powershell
npm install
npm run compile
npm run build
```

`npm run compile` regenerates `contract/managed/dataconsent`, including the contract bindings, ZKIR, and proving/verifying assets. The web build copies those assets to `web/public` before Vite runs.

## Local development

Start the local stack and proof server:

```powershell
npm run env:up
npm run web
```

Open `http://localhost:5173`. The local test environment uses the `undeployed` network. The current browser DApp is intended for Lace on Preprod; the Node E2E suite is the local-chain validation path.

Stop services when finished:

```powershell
npm run env:down
```

## Preprod setup

Copy `.env.preprod.example` to `.env.preprod` when using a hosted or local Vite build. Set:

```dotenv
VITE_NETWORK_ID=preprod
VITE_CONTRACT_ADDRESS=
```

If `VITE_CONTRACT_ADDRESS` is empty, the connected wallet can deploy a new registry from the setup screen. If it contains an existing contract address, the app joins that contract instead.

Lace requires a local proof server at `http://localhost:6300` for browser transactions. Fund the wallet from the [Midnight Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/) and generate tDUST before deploying or calling circuits.

## Tests

```powershell
npm run test
npm run test:e2e:local
npm run test:e2e:preprod
```

The lifecycle test deploys, verifies the constructor-bound authority and schema version, registers and authorizes an organization, creates owner-targeted requests, tests owner grant/reject/revoke, checks valid and invalid access, verifies expiry, and checks the recorded receipt results. Preprod tests require the configured wallet seeds and funded accounts. Local tests require Docker services to be running.

## Vercel deployment

The repository includes `vercel.json` for the monorepo build. Authenticate with Vercel, then run:

```powershell
vercel login
vercel link
vercel env add VITE_NETWORK_ID production
vercel env add VITE_CONTRACT_ADDRESS production
vercel deploy --prod
```

Set `VITE_NETWORK_ID` to `preprod` and set `VITE_CONTRACT_ADDRESS` to the deployed contract address. Do not put wallet seeds, private keys, proof-server secrets, or raw user data in Vercel environment variables. The browser still needs the user’s local Lace proof server.

After deployment, open the Vercel URL in the same browser profile as Lace and test:

1. Connect the wallet.
2. Join the configured contract or deploy a new one.
3. Confirm the dashboard loads state from the Midnight indexer.
4. Exercise organization registration, authority authorization, owner-targeted request creation, grant/reject, verification, audit receipt, and revoke flows.

## Security and product boundaries

- Never place raw personal data, private keys, seed phrases, or wallet passwords on-chain or in source control.
- Treat the owner commitment as public routing metadata, not as an authentication secret.
- Transaction approval remains in Lace; the app cannot silently sign or submit a wallet transaction.
- A receipt proves that the contract evaluated a consent check. It does not by itself force an external organization to delete or stop processing data.
- For production, add an off-chain integration service that enforces successful checks before releasing encrypted data, sends revocation/expiry notifications, and maintains the organization’s retention and compliance workflows.

## Known deployment prerequisites

The frontend build is self-contained, but full chain execution depends on external state: Docker for local testing, a running proof server for browser transactions, a compatible Lace connector, funded Preprod tNIGHT/tDUST, and a Vercel-authenticated deployment target.
