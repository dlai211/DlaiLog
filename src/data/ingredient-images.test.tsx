import { render, screen } from '@testing-library/react-native';

import {
  INGREDIENT_TILES,
  IngredientImage,
  IngredientPicture,
  findIngredientTile,
  guessIngredientTile,
  searchIngredientTiles,
} from '@/data/ingredient-images';
import { INGREDIENT_PHOTOS } from '@/data/ingredient-photos';

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

describe('the photographs', () => {
  it('belongs to a real tile — a picture can never be orphaned', () => {
    for (const key of Object.keys(INGREDIENT_PHOTOS)) {
      expect(findIngredientTile(key)).toBeDefined();
    }
  });

  it('covers the shopping basket the user photographed', () => {
    expect(Object.keys(INGREDIENT_PHOTOS).length).toBeGreaterThanOrEqual(33);
    for (const expected of ['soy-sauce', 'rice', 'egg', 'pork-belly', 'green-onion', 'dumpling']) {
      expect(Object.keys(INGREDIENT_PHOTOS)).toContain(expected);
    }
  });

  it('is used for those tiles, and drawn pictures for the rest', () => {
    const rice = findIngredientTile('rice')!;
    const detergent = findIngredientTile('detergent')!;

    const { rerender } = render(<IngredientPicture tile={rice} testID="pic" />);
    expect(screen.getByTestId('pic').props.source).toBe(INGREDIENT_PHOTOS.rice);

    rerender(<IngredientPicture tile={detergent} testID="pic" />);
    // The drawn fallback is an SVG tile, so it carries no image source.
    expect(screen.getByTestId('pic').props.source).toBeUndefined();
  });

  it('finds the right picture for a typed name', () => {
    expect(guessIngredientTile('green onions')?.key).toBe('green-onion');
    expect(guessIngredientTile('pork belly slices')?.key).toBe('pork-belly');
    expect(guessIngredientTile('napa cabbage')?.key).toBe('chinese-cabbage');
    expect(guessIngredientTile('chicken thigh')?.key).toBe('chicken-thigh');
    expect(guessIngredientTile('oyster sauce')?.key).toBe('oyster-sauce');
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

describe('the photographs added with the receipt import', () => {
  it('gives coffee, ketchup, oil and butter their own pictures', () => {
    for (const key of ['coffee', 'ketchup', 'oil', 'butter']) {
      expect(INGREDIENT_PHOTOS[key]).toBeDefined();
      expect(findIngredientTile(key)).toBeDefined();
    }
  });

  it('recognises them by name', () => {
    expect(guessIngredientTile('Signature Select Coffee Crystals Instant')?.key).toBe('coffee');
    expect(guessIngredientTile('Signature Select Ketchup Less Sodium')?.key).toBe('ketchup');
    expect(guessIngredientTile('Signature Select Oil Vegetable')?.key).toBe('oil');
    expect(guessIngredientTile('Kerrygold Garlic & Herb Butter')?.key).toBe('butter');
  });

  it('still finds a tile for the picture files’ own spellings', () => {
    expect(findIngredientTile('chicken_leg')?.key).toBe('chicken');
    expect(findIngredientTile('chinese_cabbage')?.key).toBe('chinese-cabbage');
    expect(findIngredientTile('eggs')?.key).toBe('egg');
    expect(findIngredientTile('shanghai_bok_choy')?.key).toBe('bok-choy');
    // A rename from before the receipt: stored rows keep working.
    expect(findIngredientTile('cooking-oil')?.key).toBe('oil');
  });
});
