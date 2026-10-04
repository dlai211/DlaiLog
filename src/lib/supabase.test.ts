import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The connection module reads its configuration when a client is asked for, so
 * every case below can set (or clear) the environment first.
 *
 * Each case loads the module through `isolateModules` because the client is
 * cached in a module-level variable: without a fresh copy, whichever case ran
 * first would decide what the others see.
 */
function loadModule(): typeof import('@/lib/supabase') {
  let loaded!: typeof import('@/lib/supabase');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/lib/supabase') as typeof import('@/lib/supabase');
  });
  return loaded;
}

// Spelled out rather than held in constants: Expo only replaces environment
// variables it can see by name in the source (enforced by its lint rule), and
// the same rule applies to the tests that stand in for a real environment.
const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalSecret = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function setEnv(url: string | undefined, secret: string | undefined) {
  if (url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = url;

  if (secret === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = secret;
}

afterEach(() => {
  setEnv(originalUrl, originalSecret);
});

describe('isSupabaseConfigured', () => {
  it('is false when neither value is set', () => {
    setEnv(undefined, undefined);
    expect(loadModule().isSupabaseConfigured()).toBe(false);
  });

  it('is false when only one of the two values is set', () => {
    setEnv('https://example.supabase.co', undefined);
    expect(loadModule().isSupabaseConfigured()).toBe(false);

    setEnv(undefined, 'sb_publishable_something');
    expect(loadModule().isSupabaseConfigured()).toBe(false);
  });

  it('is true once both are set', () => {
    setEnv('https://example.supabase.co', 'sb_publishable_something');
    expect(loadModule().isSupabaseConfigured()).toBe(true);
  });
});

describe('getSupabase', () => {
  it('explains how to fix a missing configuration', () => {
    setEnv(undefined, undefined);
    expect(() => loadModule().getSupabase()).toThrow(/not configured/i);
    expect(() => loadModule().getSupabase()).toThrow(/\.env/i);
  });

  it('builds a client pointed at the configured project', () => {
    setEnv('https://example.supabase.co', 'sb_publishable_something');
    const supabase = loadModule().getSupabase();

    // `supabaseUrl` is protected on the client type; reading it here is the
    // only way to prove the two values reached the constructor.
    const configured = supabase as unknown as { supabaseUrl: string; supabaseKey: string };
    expect(configured.supabaseUrl).toBe('https://example.supabase.co');
    expect(configured.supabaseKey).toBe('sb_publishable_something');
  });

  it('reuses one client rather than building one per call', () => {
    setEnv('https://example.supabase.co', 'sb_publishable_something');
    const { getSupabase } = loadModule();

    const first: SupabaseClient = getSupabase();
    expect(getSupabase()).toBe(first);
  });

  it('has the query builder the data layer will use', () => {
    setEnv('https://example.supabase.co', 'sb_publishable_something');
    const supabase = loadModule().getSupabase();

    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.from('tasks').select).toBe('function');
  });
});
