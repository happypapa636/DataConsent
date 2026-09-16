/**
 * Preprod deployment CLI.
 *
 * Usage (from WSL, after funding the wallet via the browser faucet):
 *   MIDNIGHT_NETWORK=preprod MIDNIGHT_PREPROD_SEED=<64 hex chars> \
 *   npm run deploy:preprod --workspace scripts
 *
 * Deploys + initializes the DataConsent contract and writes the address to
 * `dataconsent.preprod.address.json` at the repo root.
 */
import pino from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type EnvironmentConfiguration, waitForFunds } from '@midnight-ntwrk/testkit-js';
import { WebSocket } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

import { PREPROD_CONFIG } from '../../api/src/config.js';
import { DataConsentAPI } from '../../api/src/index.js';
import { MidnightWalletProvider, syncWallet } from './wallet.js';
import { buildProviders } from './providers.js';
import { decodeBytes32 } from '../../api/src/utils.js';

const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

async function main(): Promise<void> {
  const config = PREPROD_CONFIG;
  setNetworkId(config.networkId);

  const seed = process.env['MIDNIGHT_PREPROD_SEED']?.trim();
  if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
    throw new Error(
      'MIDNIGHT_PREPROD_SEED must be a 64-char hex seed. Fund the wallet at:\n' +
        `  ${config.faucet}\n` +
        'then re-run this script.',
    );
  }

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

  const wallet = await MidnightWalletProvider.build(logger, envConfig, { kind: 'seed', value: seed });
  await wallet.start();
  await syncWallet(logger, wallet.wallet, 60 * 60_000);
  const balance = await waitForFunds(wallet.wallet, envConfig, false, wallet.unshieldedKeystore);
  logger.info(`Wallet funded with ${balance} NIGHT`);

  const ZK_CONFIG_PATH = fileURLToPath(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'contract', 'managed', 'dataconsent'),
  );
  const providers = buildProviders(wallet, ZK_CONFIG_PATH, config, `dataconsent-authority-${Date.now()}`);

  const secretKey = Buffer.from(seed, 'hex');
  logger.info('Deploying DataConsent contract to preprod...');
  const api = await DataConsentAPI.deploy(providers, secretKey, logger);
  await api.initialize();

  const outFile = path.join(
    path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dataconsent.preprod.address.json',
  );
  fs.writeFileSync(
    outFile,
    JSON.stringify({ network: 'preprod', contractAddress: api.deployedContractAddress }, null, 2) + '\n',
  );
  logger.info(`Deployed + initialized at: ${api.deployedContractAddress}`);
  logger.info(`Address saved to: ${outFile}`);

  await wallet.stop();
}

main().catch((err) => {
  logger.error(`Deployment failed: ${err}`);
  process.exit(1);
});
