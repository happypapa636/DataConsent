import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerOrganization(context: __compactRuntime.CircuitContext<PS>,
                       name_0: Uint8Array,
                       orgType_0: bigint,
                       now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  authorizeOrganization(context: __compactRuntime.CircuitContext<PS>,
                        orgId_0: bigint,
                        now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revokeOrganization(context: __compactRuntime.CircuitContext<PS>,
                     orgId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  createConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       orgId_0: bigint,
                       ownerCommitment_0: Uint8Array,
                       purposeCode_0: bigint,
                       dataCategoryCode_0: bigint,
                       durationSeconds_0: bigint,
                       sharingAllowed_0: boolean,
                       now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancelConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       requestId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  rejectConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       requestId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  grantConsent(context: __compactRuntime.CircuitContext<PS>,
               requestId_0: bigint,
               expiresAt_0: bigint,
               now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revokeConsent(context: __compactRuntime.CircuitContext<PS>,
                consentId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyConsent(context: __compactRuntime.CircuitContext<PS>,
                consentId_0: bigint,
                purposeCode_0: bigint,
                dataCategoryCode_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  checkConsent(context: __compactRuntime.CircuitContext<PS>,
               consentId_0: bigint,
               purposeCode_0: bigint,
               dataCategoryCode_0: bigint,
               now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerOrganization(context: __compactRuntime.CircuitContext<PS>,
                       name_0: Uint8Array,
                       orgType_0: bigint,
                       now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  authorizeOrganization(context: __compactRuntime.CircuitContext<PS>,
                        orgId_0: bigint,
                        now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revokeOrganization(context: __compactRuntime.CircuitContext<PS>,
                     orgId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  createConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       orgId_0: bigint,
                       ownerCommitment_0: Uint8Array,
                       purposeCode_0: bigint,
                       dataCategoryCode_0: bigint,
                       durationSeconds_0: bigint,
                       sharingAllowed_0: boolean,
                       now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancelConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       requestId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  rejectConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       requestId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  grantConsent(context: __compactRuntime.CircuitContext<PS>,
               requestId_0: bigint,
               expiresAt_0: bigint,
               now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revokeConsent(context: __compactRuntime.CircuitContext<PS>,
                consentId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyConsent(context: __compactRuntime.CircuitContext<PS>,
                consentId_0: bigint,
                purposeCode_0: bigint,
                dataCategoryCode_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  checkConsent(context: __compactRuntime.CircuitContext<PS>,
               consentId_0: bigint,
               purposeCode_0: bigint,
               dataCategoryCode_0: bigint,
               now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  participantCommitment(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  participantCommitment(context: __compactRuntime.CircuitContext<PS>,
                        sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  registerOrganization(context: __compactRuntime.CircuitContext<PS>,
                       name_0: Uint8Array,
                       orgType_0: bigint,
                       now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  authorizeOrganization(context: __compactRuntime.CircuitContext<PS>,
                        orgId_0: bigint,
                        now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revokeOrganization(context: __compactRuntime.CircuitContext<PS>,
                     orgId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  createConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       orgId_0: bigint,
                       ownerCommitment_0: Uint8Array,
                       purposeCode_0: bigint,
                       dataCategoryCode_0: bigint,
                       durationSeconds_0: bigint,
                       sharingAllowed_0: boolean,
                       now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancelConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       requestId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  rejectConsentRequest(context: __compactRuntime.CircuitContext<PS>,
                       requestId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  grantConsent(context: __compactRuntime.CircuitContext<PS>,
               requestId_0: bigint,
               expiresAt_0: bigint,
               now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revokeConsent(context: __compactRuntime.CircuitContext<PS>,
                consentId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyConsent(context: __compactRuntime.CircuitContext<PS>,
                consentId_0: bigint,
                purposeCode_0: bigint,
                dataCategoryCode_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  checkConsent(context: __compactRuntime.CircuitContext<PS>,
               consentId_0: bigint,
               purposeCode_0: bigint,
               dataCategoryCode_0: bigint,
               now_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  organizations: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { name: Uint8Array,
                             orgType: bigint,
                             orgCommitment: Uint8Array,
                             status: bigint,
                             registeredAt: bigint,
                             authorizedAt: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { name: Uint8Array,
  orgType: bigint,
  orgCommitment: Uint8Array,
  status: bigint,
  registeredAt: bigint,
  authorizedAt: bigint
}]>
  };
  readonly orgNextId: bigint;
  organizationByCommitment: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  consentRequests: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { orgId: bigint,
                             ownerCommitment: Uint8Array,
                             purposeCode: bigint,
                             dataCategoryCode: bigint,
                             durationSeconds: bigint,
                             sharingAllowed: boolean,
                             status: bigint,
                             createdAt: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { orgId: bigint,
  ownerCommitment: Uint8Array,
  purposeCode: bigint,
  dataCategoryCode: bigint,
  durationSeconds: bigint,
  sharingAllowed: boolean,
  status: bigint,
  createdAt: bigint
}]>
  };
  readonly requestNextId: bigint;
  consents: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { requestId: bigint,
                             orgId: bigint,
                             purposeCode: bigint,
                             dataCategoryCode: bigint,
                             userCommitment: Uint8Array,
                             status: bigint,
                             sharingAllowed: boolean,
                             createdAt: bigint,
                             expiresAt: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { requestId: bigint,
  orgId: bigint,
  purposeCode: bigint,
  dataCategoryCode: bigint,
  userCommitment: Uint8Array,
  status: bigint,
  sharingAllowed: boolean,
  createdAt: bigint,
  expiresAt: bigint
}]>
  };
  readonly consentNextId: bigint;
  accessReceipts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { consentId: bigint,
                             orgId: bigint,
                             purposeCode: bigint,
                             dataCategoryCode: bigint,
                             result: bigint,
                             checkedAt: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { consentId: bigint,
  orgId: bigint,
  purposeCode: bigint,
  dataCategoryCode: bigint,
  result: bigint,
  checkedAt: bigint
}]>
  };
  readonly receiptNextId: bigint;
  readonly authorityCommitment: Uint8Array;
  readonly schemaVersion: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
