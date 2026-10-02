import { render, screen } from '@testing-library/react-native';

import {
  INGREDIENT_TILES,
  IngredientImage,
  guessIngredientTile,
  searchIngredientTiles,
} from '@/data/ingredient-images';

describe('ingredient tile library', () => {
  it('has no duplicate keys', () => {
    const keys = INGREDIENT_TILES.map((tile) => tile.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers the common shopping basket', () => {
    expect(INGREDIENT_TILES.length).toBeGreaterThanOrEqual(45);
    const keys = INGREDIENT_TILES.map((tile) => tile.key);
    for (const expected of ['soy-sauce', 'olive-oil', 'rice', 'egg', 'milk', 'chicken', 'greens', 'detergent']) {
      expect(keys).toContain(expected);
    }
  });

  it('gives every tile searchable words', () => {
    for (const tile of INGREDIENT_TILES) {
      expect(tile.label.length).toBeGreaterThan(1);
      expect(tile.keywords.length).toBeGreaterThan(0);
    }
  });
});

describe('searchIngredientTiles', () => {
  it('finds tiles by their keywords', () => {
    expect(searchIngredientTiles('soy').map((tile) => tile.key)).toContain('soy-sauce');
    expect(searchIngredientTiles('sponge').map((tile) => tile.key)).toContain('cleaning-tools');
    expect(searchIngredientTiles('toilet').map((tile) => tile.key)).toContain('paper');
  });

  it('matches labels too, case-insensitively', () => {
    expect(searchIngredientTiles('OLIVE').map((tile) => tile.key)).toContain('olive-oil');
  });

  it('returns a starter set for an empty search and nothing for nonsense', () => {
    expect(searchIngredientTiles('').length).toBeGreaterThan(0);
    expect(searchIngredientTiles('zzzzz')).toEqual([]);
  });
});

describe('guessIngredientTile', () => {
  it('recognises the ingredient behind a typed name', () => {
    expect(guessIngredientTile('Soy sauce')?.key).toBe('soy-sauce');
    expect(guessIngredientTile('Kikkoman soya sauce')?.key).toBe('soy-sauce');
    expect(guessIngredientTile('dish soap')?.key).toBe('detergent');
    expect(guessIngredientTile('free range eggs')?.key).toBe('egg');
  });

  it('prefers the most specific match', () => {
    // "olive oil" also contains "oil"; the olive-oil tile should win.
    expect(guessIngredientTile('extra virgin olive oil')?.key).toBe('olive-oil');
  });

  it('stays quiet when nothing fits', () => {
    expect(guessIngredientTile('')).toBeUndefined();
    expect(guessIngredientTile('x')).toBeUndefined();
    expect(guessIngredientTile('zzzzz')).toBeUndefined();
  });
});

describe('IngredientImage', () => {
  it('draws the stored tile', () => {
    render(<IngredientImage imageKey="rice" testID="img" />);
    expect(screen.getByTestId('img')).toBeOnTheScreen();
  });

  it('still shows a version-1 emoji when there is no tile', () => {
    render(<IngredientImage icon="🍜" testID="img" />);
    expect(screen.getByTestId('img')).toHaveTextContent('🍜');
  });

  it('falls back to a neutral tile when there is neither', () => {
    render(<IngredientImage testID="img" />);
    expect(screen.getByTestId('img')).toBeOnTheScreen();
  });
});
