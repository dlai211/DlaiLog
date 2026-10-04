import { isUuid, newId, toUuid } from '@/lib/id';

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The id from a real failure report — the shape the old fallback produced. */
const LEGACY = 'id-muuau264-wl8l4ss9';

/**
 * Runs `body` with `globalThis.crypto` replaced, then puts it back. `crypto`
 * is a getter on the global in some runtimes, so it is redefined rather than
 * assigned.
 */
function withCrypto(value: unknown, body: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
  try {
    body();
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete (globalThis as { crypto?: unknown }).crypto;
  }
}

describe('newId', () => {
  it('produces a UUID', () => {
    expect(newId()).toMatch(UUID_SHAPE);
  });

  it('produces a different one every time', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
  });

  it('still produces a UUID when randomUUID is missing', () => {
    // The bug this all started with: without `randomUUID` the old code fell
    // back to `id-…`, and PostgreSQL refused every record that carried one.
    withCrypto({ getRandomValues: (bytes: Uint8Array) => bytes.forEach((_, i) => (bytes[i] = i)) }, () => {
      expect(newId()).toMatch(UUID_SHAPE);
    });
  });

  it('still produces a UUID when there is no useful crypto at all', () => {
    withCrypto(undefined, () => {
      expect(newId()).toMatch(UUID_SHAPE);
      expect(isUuid(newId())).toBe(true);
    });
  });

  it('sets the version and variant bits, so it is a well-formed v4', () => {
    withCrypto(undefined, () => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        expect(newId()).toMatch(UUID_V4);
      }
    });
  });
});

describe('isUuid', () => {
  it('accepts a UUID in either case', () => {
    expect(isUuid('448f7798-b274-4a46-8cf7-f4c3a0fe415f')).toBe(true);
    expect(isUuid('448F7798-B274-4A46-8CF7-F4C3A0FE415F')).toBe(true);
  });

  it('rejects the things the database would reject', () => {
    for (const value of [LEGACY, '', 'not-a-uuid', '448f7798b2744a468cf7f4c3a0fe415f', '448f7798-b274-4a46-8cf7-f4c3a0fe415']) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

describe('toUuid', () => {
  it('leaves a UUID exactly as it was', () => {
    const uuid = '448f7798-b274-4a46-8cf7-f4c3a0fe415f';
    expect(toUuid(uuid)).toBe(uuid);
  });

  it('lower-cases one, since that is how the database compares them', () => {
    expect(toUuid('448F7798-B274-4A46-8CF7-F4C3A0FE415F')).toBe('448f7798-b274-4a46-8cf7-f4c3a0fe415f');
  });

  it('turns the id that failed into one the database accepts', () => {
    const converted = toUuid(LEGACY);
    expect(converted).toMatch(UUID_SHAPE);
    expect(converted).not.toBe(LEGACY);
  });

  it('gives the same answer every time — a record must keep its identity', () => {
    // This is the property the whole fix rests on. The app decides what to
    // write by comparing records against the last saved version, so an id
    // that converted differently on each pass would look like a new record
    // every time: the old row deleted, a new one inserted, forever.
    const once = toUuid(LEGACY);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(toUuid(LEGACY)).toBe(once);
    }
  });

  it('gives different ids different answers', () => {
    const ids = ['id-a', 'id-b', 'task-1', 'task-2', LEGACY, 'id-muuau264-wl8l4ss0'];
    const converted = ids.map(toUuid);
    expect(new Set(converted).size).toBe(ids.length);
  });

  it('copes with anything a name might be', () => {
    for (const value of ['', ' ', 'ünïcøde', 'a'.repeat(500), 'id-1-2', '12345']) {
      expect(isUuid(toUuid(value))).toBe(true);
    }
  });
});
