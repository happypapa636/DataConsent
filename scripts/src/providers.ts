import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type MidnightWalletProvider } from './wallet.js';
import { type NetworkConfig } from '../../api/src/config.js';

export type DataConsentCircuits =
  | 'initialize'
  | 'registerOrganization'
  | 'authorizeOrganization'
  | 'revokeOrganization'
  | 'createConsentRequest'
  | 'cancelConsentRequest'
  | 'rejectConsentRequest'
  | 'grantConsent'
  | 'revokeConsent'
  | 'verifyConsent'
  | 'checkConsent';

export type DataConsentProviders = MidnightProviders<any>;

export function buildProviders(
    wallet: MidnightWalletProvider,
    zkConfigPath: string,
    config: NetworkConfig,
    privateStateStoreName: string,
): DataConsentProviders {
    const zkConfigProvider = new NodeZkConfigProvider<DataConsentCircuits>(zkConfigPath);

    return {
        privateStateProvider: levelPrivateStateProvider({
            privateStateStoreName,
            privateStoragePasswordProvider: () => 'DataConsent-Test-Password',
            accountId: wallet.getCoinPublicKey(),
        }),
        publicDataProvider: indexerPublicDataProvider(
            config.indexer,
            config.indexerWS,
        ),
        zkConfigProvider,
        proofProvider: httpClientProofProvider(
            config.proofServer,
            zkConfigProvider,
        ),
        walletProvider: wallet,
        midnightProvider: wallet,
    };
}
