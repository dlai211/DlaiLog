/**
 * Unique ids for records — always a standard UUID.
 *
 * The database stores ids as PostgreSQL `uuid`, which accepts one shape and
 * one shape only. An id in any other form is rejected outright with
 * `22P02 invalid input syntax for type uuid`, and the record is not saved.
 *
 * That is exactly what used to happen here. The old fallback produced
 * `id-muuau264-wl8l4ss9`, which was fine while the data lived on the device
 * and had to become a real UUID once it moved to Supabase. It was reached
 * whenever `crypto.randomUUID` was missing — which is more often than it
 * sounds: any browser serving the app over plain `http` (a phone on the same
 * network, say) withholds it, because it is only offered in a "secure
 * context", and React Native's runtime does not guarantee it either.
 *
 * So there is now no such thing as a fallback that produces a *different
 * shape*. If `randomUUID` is unavailable the bytes are gathered another way
 * and formatted into a UUID here. These are record identifiers, not secrets,
 * which is why the last resort may use `Math.random`.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a string is already a UUID the database will accept. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Lays out sixteen bytes as a version-4 UUID: `8-4-4-4-12` hex digits, with
 * the version and variant bits set so the result is well formed rather than
 * merely the right length.
 */
function formatUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let index = 0; index < 16; index += 1) {
    hex.push(bytes[index].toString(16).padStart(2, '0'));
  }

  hex[6] = ((bytes[6] & 0x0f) | 0x40).toString(16).padStart(2, '0'); // version 4
  hex[8] = ((bytes[8] & 0x3f) | 0x80).toString(16).padStart(2, '0'); // variant

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

/** Sixteen bytes, from the best source of randomness this runtime offers. */
function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  const cryptoObject = globalThis.crypto as Crypto | undefined;

  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes);
  } else {
    for (let index = 0; index < 16; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return bytes;
}

export function newId(): string {
  const cryptoObject = globalThis.crypto as Crypto | undefined;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }
  return formatUuid(randomBytes());
}

/** Sixteen bytes derived from a string, by way of the FNV-1a hash. */
function bytesFromString(value: string): Uint8Array {
  const bytes = new Uint8Array(16);

  // Four rounds of a 32-bit hash, each starting from a different basis, give
  // the sixteen bytes a UUID needs.
  for (let round = 0; round < 4; round += 1) {
    let hash = (0x811c9dc5 ^ (round * 0x9e3779b9)) >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    for (let byte = 0; byte < 4; byte += 1) {
      bytes[round * 4 + byte] = (hash >>> (byte * 8)) & 0xff;
    }
  }

  return bytes;
}

/**
 * Turns any id — including one saved by an older version of the app — into a
 * UUID the database will accept.
 *
 * This is **deterministic on purpose**, and that is the whole point: the same
 * id must always become the same UUID. The app decides what to write by
 * comparing the records it has now against the ones it last saved, so an id
 * that turned into a different UUID on each pass would look like a brand-new
 * record every single time — the old row deleted, a new one inserted, for a
 * task nobody touched.
 *
 * An id that is already a UUID is returned unchanged (lower-cased, since
 * PostgreSQL compares them that way).
 */
export function toUuid(value: string): string {
  if (isUuid(value)) return value.toLowerCase();
  return formatUuid(bytesFromString(value));
}
