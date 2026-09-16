import { Buffer as NodeBuffer } from 'buffer';

// Midnight's browser bundle still uses Node's Buffer API at runtime. Vite
// aliases the package, but it does not install the global for us.
const browserRuntime = globalThis as typeof globalThis & { Buffer?: typeof NodeBuffer };
if (!browserRuntime.Buffer) browserRuntime.Buffer = NodeBuffer;
