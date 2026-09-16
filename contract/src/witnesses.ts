export type DataConsentPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createDataConsentPrivateState = (secretKey: Uint8Array): DataConsentPrivateState => ({
  secretKey,
});

export const createWitnesses = () => ({
  localSecretKey: ({
    privateState,
  }: {
    privateState: DataConsentPrivateState;
  }): [DataConsentPrivateState, Uint8Array] => [privateState, privateState.secretKey],
});
