/**
 * DataConsent common types and abstractions.
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type DataConsentPrivateState } from '../../contract/src/index.js';
import type { DataConsent } from '../../contract/src/index.js';

export const dataConsentPrivateStateKey = 'dataConsentPrivateState';
export type PrivateStateId = typeof dataConsentPrivateStateKey;

export type DataConsentCircuitKeys =
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

export type DataConsentProviders = MidnightProviders<
  DataConsentCircuitKeys,
  PrivateStateId,
  DataConsentPrivateState
>;

export type DeployedDataConsentContract = FoundContract<DataConsent.Contract<DataConsentPrivateState>>;

// ── Code catalogs (mirrors of contract conventions) ─────────────────────

export const ORG_STATUS = {
  pending: 1,
  authorized: 2,
  revoked: 3,
} as const;

export const REQUEST_STATUS = {
  open: 1,
  granted: 2,
  rejected: 3,
  cancelled: 4,
} as const;

export const CONSENT_STATUS = {
  active: 1,
  revoked: 2,
} as const;

/** AccessReceipt.result codes. */
export const RECEIPT_RESULT = {
  valid: 1,
  revoked: 2,
  expired: 3,
  purposeMismatch: 4,
  categoryMismatch: 5,
  orgInactive: 6,
} as const;

export const RECEIPT_RESULT_LABEL: Readonly<Record<number, string>> = {
  [RECEIPT_RESULT.valid]: 'Valid',
  [RECEIPT_RESULT.revoked]: 'Revoked',
  [RECEIPT_RESULT.expired]: 'Expired',
  [RECEIPT_RESULT.purposeMismatch]: 'Purpose mismatch',
  [RECEIPT_RESULT.categoryMismatch]: 'Data category mismatch',
  [RECEIPT_RESULT.orgInactive]: 'Organization inactive',
};

export const ORG_TYPE_LABEL: Readonly<Record<number, string>> = {
  1: 'Research',
  2: 'Healthcare',
  3: 'Finance',
  4: 'AI / ML',
  5: 'Marketing',
  6: 'Education',
  7: 'Government',
  8: 'Other',
};

/** Application-level purpose catalog (stored on-chain as Uint<8>). */
export const PURPOSE_LABEL: Readonly<Record<number, string>> = {
  1: 'Scientific research',
  2: 'Medical treatment',
  3: 'Service improvement',
  4: 'Marketing',
  5: 'Fraud prevention',
  6: 'Legal compliance',
  7: 'AI training',
  8: 'Analytics',
};

/** Application-level data-category catalog (stored on-chain as Uint<8>). */
export const DATA_CATEGORY_LABEL: Readonly<Record<number, string>> = {
  1: 'Contact details',
  2: 'Health records',
  3: 'Financial data',
  4: 'Biometric data',
  5: 'Location data',
  6: 'Browsing history',
  7: 'Purchase history',
  8: 'Other',
};

// ── Derived (UI-facing) types ───────────────────────────────────────────

export interface OrganizationView {
  readonly id: number;
  readonly name: string;
  readonly orgType: number;
  readonly orgTypeLabel: string;
  readonly orgCommitment: string;
  readonly status: number;
  readonly registeredAt: number;
  readonly authorizedAt: number;
}

export interface ConsentRequestView {
  readonly id: number;
  readonly orgId: number;
  readonly ownerCommitment: string;
  readonly purposeCode: number;
  readonly purposeLabel: string;
  readonly dataCategoryCode: number;
  readonly dataCategoryLabel: string;
  readonly durationSeconds: number;
  readonly sharingAllowed: boolean;
  readonly status: number;
  readonly createdAt: number;
}

export interface ConsentView {
  readonly id: number;
  readonly requestId: number;
  readonly orgId: number;
  readonly purposeCode: number;
  readonly purposeLabel: string;
  readonly dataCategoryCode: number;
  readonly dataCategoryLabel: string;
  readonly userCommitment: string;
  readonly status: number;
  readonly sharingAllowed: boolean;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface AccessReceiptView {
  readonly id: number;
  readonly consentId: number;
  readonly orgId: number;
  readonly purposeCode: number;
  readonly dataCategoryCode: number;
  readonly result: number;
  readonly resultLabel: string;
  readonly checkedAt: number;
}

export interface DataConsentDerivedState {
  readonly orgCount: number;
  readonly requestCount: number;
  readonly consentCount: number;
  readonly receiptCount: number;
  readonly organizations: OrganizationView[];
  readonly requests: ConsentRequestView[];
  readonly consents: ConsentView[];
  readonly receipts: AccessReceiptView[];
  readonly authorityInitialized: boolean;
  readonly authorityCommitment: string;
}
