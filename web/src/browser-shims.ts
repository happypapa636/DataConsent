import { Buffer as NodeBuffer } from 'buffer';

// Midnight's browser bundle still uses Node's Buffer API at runtime. Vite
// aliases the package, but it does not install the global for us.
const browserRuntime = globalThis as typeof globalThis & { Buffer?: typeof NodeBuffer };
if (!browserRuntime.Buffer) browserRuntime.Buffer = NodeBuffer;

// Keep the explicit window assignment as well; some connector/browser
// contexts resolve globals through window rather than globalThis.
const browserWindow = window as Window & { Buffer?: typeof NodeBuffer };
if (!browserWindow.Buffer) browserWindow.Buffer = NodeBuffer;
