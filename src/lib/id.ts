/**
 * Unique ids for records. Browsers provide `crypto.randomUUID()`; the
 * timestamp+random fallback keeps things working anywhere else (e.g. tests).
 */
export function newId(): string {
  const cryptoObject = globalThis.crypto as Crypto | undefined;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
