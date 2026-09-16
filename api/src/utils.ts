/** Zero-padded 32-byte codec for `Bytes<32>` contract values (names, etc.). */
export function encodeBytes32(input: string): Uint8Array {
  if (!input.trim() || input.includes('\0')) throw new Error('Enter a non-empty name without null characters.');
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(input);
  if (encoded.length > 32) {
    throw new Error(`Value exceeds 32 bytes: '${input}' (${encoded.length} bytes)`);
  }
  bytes.set(encoded);
  return bytes;
}

export function decodeBytes32(bytes: Uint8Array): string {
  const firstZero = bytes.findIndex((b) => b === 0);
  const end = firstZero === -1 ? bytes.length : firstZero;
  return new TextDecoder().decode(bytes.slice(0, end));
}

/** Short hex preview like `0x1a2b…9c` for UI display. */
export function shortHex(bytes: Uint8Array, keep = 4): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `0x${hex.slice(0, keep)}…${hex.slice(-keep)}`;
}

/** Fixed 32-byte commitment codec — used for wallet secret keys. */
export function normalizeSecretKey(sk: Uint8Array): Uint8Array {
  if (sk.length !== 32 || !sk.some((byte) => byte !== 0)) {
    throw new Error('Identity secret must be exactly 32 non-zero bytes.');
  }
  return new Uint8Array(sk);
}

/** Complete commitments are identifiers; shortened strings are display-only. */
export function commitmentHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function assertInteger(value: number, label: string, min = 1, max = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
  }
}
