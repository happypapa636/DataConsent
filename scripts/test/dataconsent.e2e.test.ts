/**
 * DataConsent end-to-end test: deploy → register → authorize →
 * request → grant → verify → check/receipts → revoke → expiry + negatives.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract, type DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type EnvironmentConfiguration, waitForFunds } from '@midnight-ntwrk/testkit-js';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { getConfig } from '../../api/src/config.js';
import {
  DataConsentAPI,
  ORG_STATUS,
  REQUEST_STATUS,
  CONSENT_STATUS,
  RECEIPT_RESULT,
} from '../../api/src/index.js';
import { CompiledDataConsentContract, createDataConsentPrivateState, DataConsent } from '../../contract/src/index.js';
import { MidnightWalletProvider, syncWallet, type WalletSecret } from '../src/wallet.js';
import { buildProviders, type DataConsentProviders } from '../src/providers.js';

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

// Midnight proof generation can exceed Vitest's five-second default on a cold local stack.
vi.setConfig({ testTimeout: 20 * 60_000, hookTimeout: 20 * 60_000 });

const network = process.env['MIDNIGHT_NETWORK'] ?? 'local';
const ZK_CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'contract', 'managed', 'dataconsent',
);

/** Distinct local seeds per participant. */
const LOCAL_SEEDS: Record<string, string> = {
  authority: '0000000000000000000000000000000000000000000000000000000000000001',
  org: '0000000000000000000000000000000000000000000000000000000000000002',
  user: '0000000000000000000000000000000000000000000000000000000000000003',
};

function resolveSecret(role: string): WalletSecret {
  if (network === 'local') return { kind: 'seed', value: LOCAL_SEEDS[role]! };
  const upper = network.toUpperCase();
  const seedHex = process.env[`MIDNIGHT_${upper}_${role.toUpperCase()}_SEED`]?.trim();
  const fallback = process.env[`MIDNIGHT_${upper}_SEED`]?.trim();
  const seed = seedHex ?? (role === 'authority' ? fallback : undefined);
  if (!seed) {
    throw new Error(
      `Missing seed for '${role}' on '${network}'. Set MIDNIGHT_${upper}_${role.toUpperCase()}_SEED.`,
    );
  }
  return { kind: 'seed', value: seed };
}

type Participant = {
  role: string;
  wallet: MidnightWalletProvider;
  providers: DataConsentProviders;
  api?: DataConsentAPI;
};

describe(`DataConsent lifecycle (${network})`, () => {
  const config = getConfig();
  const isRemote = network !== 'local';
  const syncTimeoutMs = Number(
    process.env['MIDNIGHT_SYNC_TIMEOUT_MS'] ?? (isRemote ? 60 * 60_000 : 10 * 60_000),
  );

  let authority: Participant;
  let org: Participant;
  let user: Participant;
  let contractAddress: ContractAddress;

  async function startParticipant(role: string): Promise<Participant> {
    const secret = resolveSecret(role);
    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };
    const wallet = await MidnightWalletProvider.build(logger, envConfig, secret);
    await wallet.start();
    await syncWallet(logger, wallet.wallet, syncTimeoutMs);
    if (isRemote) {
      const balance = await waitForFunds(wallet.wallet, envConfig, false, wallet.unshieldedKeystore);
      logger.info(`[${role}] NIGHT balance on '${network}': ${balance}`);
    }
    const providers = buildProviders(
      wallet,
      ZK_CONFIG_PATH,
      config,
      `dataconsent-${role}-${Date.now()}`,
    );
    logger.info(`[${role}] ready`);
    return { role, wallet, providers };
  }

  async function ledgerOf() {
    const state = await authority.providers.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    const mod = await import('../../contract/managed/dataconsent/contract/index.js');
    return mod.ledger(state!.data);
  }

  const nowSec = () => BigInt(Math.floor(Date.now() / 1000));
  const userCommitment = DataConsent.pureCircuits.participantCommitment(new Uint8Array(32).fill(0x03));

  beforeAll(async () => {
    setNetworkId(config.networkId);
    authority = await startParticipant('authority');
    org = await startParticipant('org');
    user = await startParticipant('user');
    logger.info('All participants initialized. Ready to test!');
  }, 20 * 60_000);

  afterAll(async () => {
    for (const p of [authority, org, user]) {
      if (p?.wallet) {
        await p.wallet.stop();
      }
    }
  });

  it('deploys the contract with the authority bound at construction', async () => {
    const deployed: DeployedContract<any> = await (deployContract as any)(authority.providers, {
      compiledContract: CompiledDataConsentContract,
      privateStateId: 'dataConsentPrivateState',
      initialPrivateState: createDataConsentPrivateState(new Uint8Array(32).fill(0x01)),
    });
    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at: ${contractAddress}`);
    expect(contractAddress).toBeDefined();

    authority.api = await DataConsentAPI.join(authority.providers, contractAddress, new Uint8Array(32).fill(0x01), logger);
    org.api = await DataConsentAPI.join(org.providers, contractAddress, new Uint8Array(32).fill(0x02), logger);
    user.api = await DataConsentAPI.join(user.providers, contractAddress, new Uint8Array(32).fill(0x03), logger);

    const ledger = await ledgerOf();
    expect(ledger.authorityCommitment.some((b: number) => b !== 0)).toBe(true);
    expect(ledger.schemaVersion).toBe(2n);
  }, 20 * 60_000);

  it('registers a pending organization, then the authority authorizes it', async () => {
    await org.api!.registerOrganization('Acme Health Analytics', 2, nowSec());

    let ledger = await ledgerOf();
    expect(ledger.organizations.size()).toBe(1n);
    const orgEntry = ledger.organizations.lookup(1n);
    expect(orgEntry.name.length > 0).toBe(true);
    expect(Number(orgEntry.status)).toBe(ORG_STATUS.pending);
    expect(orgEntry.orgCommitment.some((b: number) => b !== 0)).toBe(true);

    await authority.api!.authorizeOrganization(1, nowSec());

    ledger = await ledgerOf();
    expect(Number(ledger.organizations.lookup(1n).status)).toBe(ORG_STATUS.authorized);
  });

  it('org creates a consent request; user grants consent within duration', async () => {
    // purpose 2 = medical treatment, category 2 = health records, 1 hour window
    await org.api!.createConsentRequest(1, userCommitment, 2, 2, 3600, false, nowSec());

    let ledger = await ledgerOf();
    expect(ledger.consentRequests.lookup(1n).status == BigInt(REQUEST_STATUS.open)).toBe(true);

    // User grants: expiry = now + 3600 (within the requested window)
    const grantNow = nowSec();
    await user.api!.grantConsent(1, grantNow + 3600n, grantNow);

    ledger = await ledgerOf();
    expect(Number(ledger.consentRequests.lookup(1n).status)).toBe(REQUEST_STATUS.granted);
    const consent = ledger.consents.lookup(1n);
    expect(Number(consent.status)).toBe(CONSENT_STATUS.active);
    expect(consent.userCommitment.some((b: number) => b !== 0)).toBe(true);
  });

  it('org verifies consent (ZK gate passes) and audits via checkConsent → valid receipt', async () => {
    await org.api!.verifyConsent(1, 2, 2); // must not throw
    await org.api!.checkConsent(1, 2, 2, nowSec());

    const ledger = await ledgerOf();
    expect(Number(ledger.accessReceipts.lookup(1n).result)).toBe(RECEIPT_RESULT.valid);
  });

  it('rejects verification with a mismatched purpose', async () => {
    await expect(org.api!.verifyConsent(1, 4, 2)).rejects.toThrow();
    // Audit instead records the mismatch as a receipt
    await org.api!.checkConsent(1, 4, 2, nowSec());
    const ledger = await ledgerOf();
    expect(Number(ledger.accessReceipts.lookup(2n).result)).toBe(RECEIPT_RESULT.purposeMismatch);
  });

  it('user revokes consent; org can no longer verify and gets a revoked receipt', async () => {
    await user.api!.revokeConsent(1);

    const ledger = await ledgerOf();
    expect(Number(ledger.consents.lookup(1n).status)).toBe(CONSENT_STATUS.revoked);

    await expect(org.api!.verifyConsent(1, 2, 2)).rejects.toThrow();
    await org.api!.checkConsent(1, 2, 2, nowSec());
    const ledger2 = await ledgerOf();
    expect(Number(ledger2.accessReceipts.lookup(3n).result)).toBe(RECEIPT_RESULT.revoked);
  });

  it('expiry: a short consent expires and checks report it', async () => {
    // Keep the window long enough for a cold proof server to submit the grant.
    await org.api!.createConsentRequest(1, userCommitment, 8, 6, 120, false, nowSec()); // 2-minute window
    const grantNow = nowSec();
    await user.api!.grantConsent(2, grantNow + 2n, grantNow);

    // Wait past expiry (block time based)
    await new Promise((r) => setTimeout(r, 130_000));

    await expect(org.api!.verifyConsent(2, 8, 6)).rejects.toThrow();
    await org.api!.checkConsent(2, 8, 6, nowSec());
    const ledger = await ledgerOf();
    expect(Number(ledger.accessReceipts.lookup(4n).result)).toBe(RECEIPT_RESULT.expired);
  });

  it('user can reject an open request and org can cancel its own', async () => {
    await org.api!.createConsentRequest(1, userCommitment, 4, 1, 3600, true, nowSec()); // request 3
    await expect(org.api!.rejectConsentRequest(3)).rejects.toThrow();
    await user.api!.rejectConsentRequest(3);

    await org.api!.createConsentRequest(1, userCommitment, 6, 3, 3600, false, nowSec()); // request 4
    await org.api!.cancelConsentRequest(4);

    const ledger = await ledgerOf();
    expect(Number(ledger.consentRequests.lookup(3n).status)).toBe(REQUEST_STATUS.rejected);
    expect(Number(ledger.consentRequests.lookup(4n).status)).toBe(REQUEST_STATUS.cancelled);
  });
});
