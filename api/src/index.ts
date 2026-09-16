/**
 * DataConsent API — shared business logic for the consent-management contract.
 *
 * Platform-agnostic: works from the browser (Lace wallet) or CLI (wallet-sdk).
 * Each platform supplies its own provider implementations.
 *
 * @packageDocumentation
 */

import * as DataConsent from '../../contract/managed/dataconsent/contract/index.js';
import {
  CompiledDataConsentContract,
  createDataConsentPrivateState,
} from '../../contract/src/index.js';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, shareReplay, type Observable } from 'rxjs';
import { type Logger } from 'pino';
import {
  type DataConsentDerivedState,
  type DataConsentProviders,
  type DeployedDataConsentContract,
  dataConsentPrivateStateKey,
  RECEIPT_RESULT_LABEL,
  ORG_TYPE_LABEL,
  PURPOSE_LABEL,
  DATA_CATEGORY_LABEL,
  type OrganizationView,
  type ConsentRequestView,
  type ConsentView,
  type AccessReceiptView,
} from './common-types.js';
import { encodeBytes32, decodeBytes32, commitmentHex, normalizeSecretKey, assertInteger } from './utils.js';

/**
 * API for a deployed DataConsent contract.
 * Created via `DataConsentAPI.deploy()` (authority) or `DataConsentAPI.join()`.
 */
export class DataConsentAPI {
  private constructor(
    public readonly deployedContract: DeployedDataConsentContract,
    providers: DataConsentProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);

    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => DataConsent.ledger(contractState.data)),
        map((ledgerState) => deriveState(ledgerState)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<DataConsentDerivedState>;

  /** Compatibility guard for callers built against v1; v2 binds authority at deployment. */
  async initialize(): Promise<void> {
    throw new Error('Authority is bound during deployment in DataConsent v2. Deploy a new registry to change it.');
  }

  async registerOrganization(name: string, orgType: number, now: bigint): Promise<void> {
    assertInteger(orgType, 'Organization type', 1, 8);
    await this.deployedContract.callTx.registerOrganization(
      encodeBytes32(name.trim()),
      BigInt(orgType),
      now,
    );
  }

  async authorizeOrganization(orgId: number, now: bigint): Promise<void> {
    assertInteger(orgId, 'Organization ID');
    await this.deployedContract.callTx.authorizeOrganization(BigInt(orgId), now);
  }

  async revokeOrganization(orgId: number): Promise<void> {
    assertInteger(orgId, 'Organization ID');
    await this.deployedContract.callTx.revokeOrganization(BigInt(orgId));
  }

  async createConsentRequest(
    orgId: number,
    ownerCommitment: Uint8Array,
    purposeCode: number,
    dataCategoryCode: number,
    durationSeconds: number,
    sharingAllowed: boolean,
    now: bigint,
  ): Promise<void> {
    assertInteger(orgId, 'Organization ID');
    assertInteger(purposeCode, 'Purpose', 1, 8);
    assertInteger(dataCategoryCode, 'Data category', 1, 8);
    assertInteger(durationSeconds, 'Duration', 1, 31_536_000);
    if (ownerCommitment.length !== 32 || !ownerCommitment.some(Boolean)) throw new Error('A non-zero, 32-byte owner commitment is required.');
    await this.deployedContract.callTx.createConsentRequest(
      BigInt(orgId),
      ownerCommitment,
      BigInt(purposeCode),
      BigInt(dataCategoryCode),
      BigInt(durationSeconds),
      sharingAllowed,
      now,
    );
  }

  async cancelConsentRequest(requestId: number): Promise<void> {
    assertInteger(requestId, 'Request ID');
    await this.deployedContract.callTx.cancelConsentRequest(BigInt(requestId));
  }

  async rejectConsentRequest(requestId: number): Promise<void> {
    assertInteger(requestId, 'Request ID');
    await this.deployedContract.callTx.rejectConsentRequest(BigInt(requestId));
  }

  async grantConsent(requestId: number, expiresAt: bigint, now: bigint): Promise<void> {
    assertInteger(requestId, 'Request ID');
    if (expiresAt <= now) throw new Error('Expiry must be in the future.');
    await this.deployedContract.callTx.grantConsent(BigInt(requestId), expiresAt, now);
  }

  async revokeConsent(consentId: number): Promise<void> {
    assertInteger(consentId, 'Consent ID');
    await this.deployedContract.callTx.revokeConsent(BigInt(consentId));
  }

  /** Hard ZK gate — throws if the consent cannot be verified. */
  async verifyConsent(consentId: number, purposeCode: number, dataCategoryCode: number): Promise<void> {
    assertInteger(consentId, 'Consent ID');
    assertInteger(purposeCode, 'Purpose', 1, 8);
    assertInteger(dataCategoryCode, 'Data category', 1, 8);
    await this.deployedContract.callTx.verifyConsent(
      BigInt(consentId),
      BigInt(purposeCode),
      BigInt(dataCategoryCode),
    );
  }

  /** Non-asserting audit check; records an on-chain AccessReceipt. */
  async checkConsent(
    consentId: number,
    purposeCode: number,
    dataCategoryCode: number,
    now: bigint,
  ): Promise<void> {
    assertInteger(consentId, 'Consent ID');
    assertInteger(purposeCode, 'Purpose', 1, 8);
    assertInteger(dataCategoryCode, 'Data category', 1, 8);
    await this.deployedContract.callTx.checkConsent(
      BigInt(consentId),
      BigInt(purposeCode),
      BigInt(dataCategoryCode),
      now,
    );
  }

  /** Deploy a new DataConsent contract (authority operation). */
  static async deploy(
    providers: DataConsentProviders,
    secretKey: Uint8Array,
    logger?: Logger,
  ): Promise<DataConsentAPI> {
    const deployedContract = await deployContract(providers, {
      compiledContract: CompiledDataConsentContract,
      privateStateId: dataConsentPrivateStateKey,
      initialPrivateState: createDataConsentPrivateState(normalizeSecretKey(secretKey)),
    });
    return new DataConsentAPI(deployedContract, providers, logger);
  }

  /** Join an existing DataConsent contract (any participant). */
  static async join(
    providers: DataConsentProviders,
    contractAddress: ContractAddress,
    secretKey: Uint8Array,
    logger?: Logger,
  ): Promise<DataConsentAPI> {
    if (!/^[a-fA-F0-9]{64}$/.test(contractAddress)) throw new Error('Contract address must contain 64 hexadecimal characters.');
    const publicState = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!publicState) throw new Error('Contract was not found on this network. Check the address and network.');
    try {
      if (DataConsent.ledger(publicState.data).schemaVersion !== 2n) throw new Error('version');
    } catch {
      throw new Error('This registry is incompatible with DataConsent v2. Deploy or join a v2 registry.');
    }
    const deployedContract = await findDeployedContract(providers, {
      contractAddress,
      compiledContract: CompiledDataConsentContract,
      privateStateId: dataConsentPrivateStateKey,
      initialPrivateState: createDataConsentPrivateState(normalizeSecretKey(secretKey)),
    });
    return new DataConsentAPI(deployedContract, providers, logger);
  }
}

// ── Ledger → view mapping ───────────────────────────────────────────────

type LedgerState = ReturnType<typeof DataConsent.ledger>;

/** Derive the public commitment that identifies a participant without exposing their secret. */
export function deriveParticipantCommitment(secretKey: Uint8Array): Uint8Array {
  return DataConsent.pureCircuits.participantCommitment(normalizeSecretKey(secretKey));
}

export function deriveState(ledgerState: LedgerState): DataConsentDerivedState {
  const organizations: OrganizationView[] = [];
  for (const [key, org] of ledgerState.organizations) {
    organizations.push({
      id: Number(key),
      name: decodeBytes32(org.name),
      orgType: Number(org.orgType),
      orgTypeLabel: ORG_TYPE_LABEL[Number(org.orgType)] ?? 'Unknown',
      orgCommitment: commitmentHex(org.orgCommitment),
      status: Number(org.status),
      registeredAt: Number(org.registeredAt),
      authorizedAt: Number(org.authorizedAt),
    });
  }
  organizations.sort((a, b) => a.id - b.id);

  const requests: ConsentRequestView[] = [];
  for (const [key, req] of ledgerState.consentRequests) {
    requests.push({
      id: Number(key),
      orgId: Number(req.orgId),
      ownerCommitment: commitmentHex(req.ownerCommitment),
      purposeCode: Number(req.purposeCode),
      purposeLabel: PURPOSE_LABEL[Number(req.purposeCode)] ?? 'Unknown',
      dataCategoryCode: Number(req.dataCategoryCode),
      dataCategoryLabel: DATA_CATEGORY_LABEL[Number(req.dataCategoryCode)] ?? 'Unknown',
      durationSeconds: Number(req.durationSeconds),
      sharingAllowed: req.sharingAllowed,
      status: Number(req.status),
      createdAt: Number(req.createdAt),
    });
  }
  requests.sort((a, b) => b.id - a.id);

  const consents: ConsentView[] = [];
  for (const [key, consent] of ledgerState.consents) {
    consents.push({
      id: Number(key),
      requestId: Number(consent.requestId),
      orgId: Number(consent.orgId),
      purposeCode: Number(consent.purposeCode),
      purposeLabel: PURPOSE_LABEL[Number(consent.purposeCode)] ?? 'Unknown',
      dataCategoryCode: Number(consent.dataCategoryCode),
      dataCategoryLabel: DATA_CATEGORY_LABEL[Number(consent.dataCategoryCode)] ?? 'Unknown',
      userCommitment: commitmentHex(consent.userCommitment),
      status: Number(consent.status),
      sharingAllowed: consent.sharingAllowed,
      createdAt: Number(consent.createdAt),
      expiresAt: Number(consent.expiresAt),
    });
  }
  consents.sort((a, b) => b.id - a.id);

  const receipts: AccessReceiptView[] = [];
  for (const [key, receipt] of ledgerState.accessReceipts) {
    receipts.push({
      id: Number(key),
      consentId: Number(receipt.consentId),
      orgId: Number(receipt.orgId),
      purposeCode: Number(receipt.purposeCode),
      dataCategoryCode: Number(receipt.dataCategoryCode),
      result: Number(receipt.result),
      resultLabel: RECEIPT_RESULT_LABEL[Number(receipt.result)] ?? 'Unknown',
      checkedAt: Number(receipt.checkedAt),
    });
  }
  receipts.sort((a, b) => b.id - a.id);

  const authorityInitialized = ledgerState.authorityCommitment.some((b) => b !== 0);

  return {
    orgCount: Number(ledgerState.orgNextId),
    requestCount: Number(ledgerState.requestNextId),
    consentCount: Number(ledgerState.consentNextId),
    receiptCount: Number(ledgerState.receiptNextId),
    organizations,
    requests,
    consents,
    receipts,
    authorityInitialized,
    authorityCommitment: commitmentHex(ledgerState.authorityCommitment),
  };
}

export * from './common-types.js';
export * from './utils.js';
export * from './config.js';

