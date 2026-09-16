import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { fromHex, toHex, type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Binding,
  Proof,
  SignatureEnabled,
  Transaction,
  type FinalizedTransaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import semver from 'semver';
import {
  DataConsentAPI,
  deriveParticipantCommitment,
  type DataConsentCircuitKeys,
  type DataConsentDerivedState,
  type DataConsentProviders,
} from 'dataconsent-api';

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

export const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID || 'preprod') as 'preprod' | 'preview' | 'undeployed';
export const CONTRACT_ADDRESS_KEY = 'dataconsent.contractAddress';
const SECRET_KEY_PREFIX = 'dataconsent.identitySecret.';
const COMPATIBLE_CONNECTOR_API_VERSION = '^4.0.0';

export type WalletSession = {
  readonly initial: InitialAPI;
  readonly connected: ConnectedAPI;
  readonly networkId: string;
  readonly address: string;
  readonly balance: string;
};

export function discoverWallet(): InitialAPI | undefined {
  return Object.values(window.midnight ?? {}).find(
    (wallet): wallet is InitialAPI =>
      Boolean(wallet?.name && wallet?.apiVersion && semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)),
  );
}

export async function connectWallet(): Promise<{ session: WalletSession; providers: DataConsentProviders }> {
  const initial = discoverWallet();
  if (!initial) throw new Error('No compatible Midnight wallet found. Install Lace and refresh this page.');

  // The connector must be called from the button handler so the wallet can open its approval dialog.
  const connected = await initial.connect(NETWORK_ID);
  const status = await connected.getConnectionStatus();
  if (status.status !== 'connected') throw new Error('Wallet connection was not approved.');
  setNetworkId(status.networkId as 'preprod' | 'preview' | 'undeployed');

  const config = await connected.getConfiguration();
  const addresses = await connected.getShieldedAddresses();
  const balance = await connected.getShieldedBalances();
  const balanceValue = Object.values(balance)[0] ?? 0n;
  const providers = createProviders(connected, config, addresses.shieldedCoinPublicKey, addresses.shieldedEncryptionPublicKey);

  return {
    session: {
      initial,
      connected,
      networkId: status.networkId,
      address: addresses.shieldedAddress,
      balance: formatNight(balanceValue),
    },
    providers,
  };
}

function createProviders(
  connected: ConnectedAPI,
  config: Awaited<ReturnType<ConnectedAPI['getConfiguration']>>,
  accountId: string,
  encryptionKey: string,
): DataConsentProviders {
  const zkConfigProvider = new FetchZkConfigProvider<DataConsentCircuitKeys>(window.location.origin, fetch.bind(window));
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: 'dataconsent-browser-state',
    signingKeyStoreName: 'dataconsent-browser-signing-keys',
    // Derive the browser-store key from the wallet account so no shared secret
    // or user data is shipped in the bundle. The wallet still protects all
    // transaction approvals and the store is scoped to this browser profile.
    privateStoragePasswordProvider: () => `dataconsent:${accountId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 64)}`,
    accountId,
  });

  return {
    privateStateProvider,
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    zkConfigProvider: zkConfigProvider as DataConsentProviders['zkConfigProvider'],
    proofProvider: httpClientProofProvider(config.proverServerUri ?? 'http://127.0.0.1:6300', zkConfigProvider),
    walletProvider: {
      getCoinPublicKey: () => accountId,
      getEncryptionPublicKey: () => encryptionKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const received = await connected.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(received.tx));
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connected.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  } as DataConsentProviders;
}

function getSecretKey(accountId = 'default'): Uint8Array {
  const storageKey = `${SECRET_KEY_PREFIX}${accountId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 80)}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) return Uint8Array.from(atob(stored), (character) => character.charCodeAt(0));
  const secret = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(storageKey, btoa(String.fromCharCode(...secret)));
  return secret;
}

export async function joinContract(providers: DataConsentProviders, address: string, accountId?: string): Promise<DataConsentAPI> {
  return DataConsentAPI.join(providers, address as ContractAddress, getSecretKey(accountId));
}

export async function deployContractFromBrowser(providers: DataConsentProviders, accountId?: string): Promise<DataConsentAPI> {
  const api = await DataConsentAPI.deploy(providers, getSecretKey(accountId));
  localStorage.setItem(CONTRACT_ADDRESS_KEY, api.deployedContractAddress);
  return api;
}

export function getConfiguredContractAddress(): string | undefined {
  return import.meta.env.VITE_CONTRACT_ADDRESS || localStorage.getItem(CONTRACT_ADDRESS_KEY) || undefined;
}

export function getIdentityCommitmentHex(accountId?: string): string {
  return toHex(deriveParticipantCommitment(getSecretKey(accountId)));
}

export function commitmentFromHex(value: string): Uint8Array {
  const normalized = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Owner commitment must be exactly 32 bytes of hexadecimal text.');
  }
  return fromHex(normalized);
}

export function formatNight(value: bigint): string {
  return `${Number(value) / 1_000_000} tNIGHT`;
}

export function subscribeToState(api: DataConsentAPI, onState: (state: DataConsentDerivedState) => void, onError: (error: Error) => void): () => void {
  const subscription = api.state$.subscribe({ next: onState, error: onError });
  return () => subscription.unsubscribe();
}
