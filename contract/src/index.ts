import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * as DataConsent from '../managed/dataconsent/contract/index.js';
export {
  createWitnesses,
  createDataConsentPrivateState,
} from './witnesses.js';
export type { DataConsentPrivateState } from './witnesses.js';

import * as DataConsentContract from '../managed/dataconsent/contract/index.js';
import { createWitnesses } from './witnesses.js';

export const CompiledDataConsentContract = CompiledContract.make(
  'dataconsent',
  DataConsentContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets('./managed/dataconsent'),
);
