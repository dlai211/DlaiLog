import { EMOJI_CATALOG, EMOJI_RESULT_LIMIT, searchEmojis } from '@/data/emoji-catalog';

describe('emoji catalog', () => {
  it('contains no duplicate emoji', () => {
    const emojis = EMOJI_CATALOG.map((entry) => entry.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('gives every emoji at least one keyword', () => {
    for (const entry of EMOJI_CATALOG) {
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });

  it('is big enough to cover food and household shopping', () => {
    expect(EMOJI_CATALOG.length).toBeGreaterThan(100);
  });
});

describe('searchEmojis', () => {
  it('finds condiment staples by keyword', () => {
    expect(searchEmojis('soy').map((entry) => entry.emoji)).toContain('🍜');
    expect(searchEmojis('oil').map((entry) => entry.emoji)).toContain('🫒');
    expect(searchEmojis('salt').map((entry) => entry.emoji)).toContain('🧂');
  });

  it('finds household items', () => {
    expect(searchEmojis('sponge').map((entry) => entry.emoji)).toContain('🧽');
    expect(searchEmojis('toilet').map((entry) => entry.emoji)).toContain('🧻');
  });

  it('is case-insensitive and ignores surrounding spaces', () => {
    expect(searchEmojis('  RICE ')).toEqual(searchEmojis('rice'));
    expect(searchEmojis('rice').length).toBeGreaterThan(0);
  });

  it('returns a starter set for an empty search', () => {
    expect(searchEmojis('')).toHaveLength(EMOJI_RESULT_LIMIT);
  });

  it('returns nothing for a nonsense search', () => {
    expect(searchEmojis('zzzzzz')).toEqual([]);
  });

  it('never returns more than the limit', () => {
    // "a" appears in many keywords; the result must still be capped.
    expect(searchEmojis('a').length).toBeLessThanOrEqual(EMOJI_RESULT_LIMIT);
  });
});
