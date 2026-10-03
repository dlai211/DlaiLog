import { Image } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { findIngredientPhoto } from '@/data/ingredient-photos';
import { useTheme } from '@/hooks/use-theme';

/**
 * The ingredient picture library.
 *
 * Every grocery item has a picture. Where a real photograph exists (see
 * ingredient-photos.ts) it is shown; everything else falls back to a drawn
 * tile: a soft tinted square with a simple silhouette of the kind of thing it
 * is — a bottle, a jar, a bag, a leaf. The drawn tiles are vector, so they
 * stay crisp at any size, need no internet, and take their colour from this
 * file, which keeps them in the app's palette in both light and dark mode.
 */

type ShapeName =
  | 'bottle'
  | 'jar'
  | 'bag'
  | 'box'
  | 'can'
  | 'carton'
  | 'round'
  | 'leaf'
  | 'egg'
  | 'meat'
  | 'fish'
  | 'grain'
  | 'bread'
  | 'tube'
  | 'utensil';

interface Shape {
  /** The main silhouette, drawn filled. */
  fill?: string;
  /** Detail lines drawn on top, stroked. */
  lines?: string[];
  circles?: [number, number, number][];
  ellipses?: [number, number, number, number][];
}

/** All drawn on a 48×48 grid. */
const SHAPES: Record<ShapeName, Shape> = {
  bottle: {
    fill: 'M21 5h6v6l3.5 5.5a3 3 0 0 1 .5 1.6V40a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3V18.1a3 3 0 0 1 .5-1.6L21 11z',
    lines: ['M17.5 24h13'],
  },
  jar: {
    fill: 'M15 14h18v24a5 5 0 0 1-5 5H20a5 5 0 0 1-5-5z',
    lines: ['M13 8h22v6H13z'],
  },
  bag: {
    fill: 'M13 17h22l-2.2 23.2a3 3 0 0 1-3 2.8H18.2a3 3 0 0 1-3-2.8z',
    lines: ['M18.5 17v-4.5a5.5 5.5 0 0 1 11 0V17'],
  },
  box: {
    fill: 'M24 6 42 15v18L24 42 6 33V15z',
    lines: ['M6 15l18 9 18-9', 'M24 24v18'],
  },
  can: {
    fill: 'M12 13c0-3 5.4-5 12-5s12 2 12 5v24a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z',
    ellipses: [[24, 13, 12, 4.5]],
  },
  carton: {
    fill: 'M20 7h8l5 9v24a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V16z',
    lines: ['M15 16h18', 'M20 7l4 9 4-9'],
  },
  round: {
    fill: 'M24 10a15 15 0 1 0 0 30 15 15 0 0 0 0-30z',
    lines: ['M24 10V5'],
  },
  leaf: {
    fill: 'M41 7C22 7 8 16 8 30c0 6 4 10 10 10 14 0 23-16 23-33z',
    lines: ['M14 35C24 27 33 19 38 10'],
  },
  egg: { fill: 'M24 7c7.5 0 12.5 11 12.5 19.5a12.5 12.5 0 0 1-25 0C11.5 18 16.5 7 24 7z' },
  meat: {
    fill: 'M11 26c0-8.5 8-14.5 18-12.5 8.5 1.6 12.5 6.5 10.5 13-2 6.5-9 11.5-17 10.5-7-1-11.5-5-11.5-11z',
    circles: [[32, 22, 3.4]],
  },
  fish: {
    fill: 'M11 24c6-7.5 17.5-8.5 25-2 2 1.7 3.4 2.3 5 2.3-1 2.2-2.2 3.3-4.2 4.6-7.6 5.6-19 4.6-25.8-2.9z',
    lines: ['M5 24l6.5-6.5v13z'],
    circles: [[17, 21, 1.6]],
  },
  grain: {
    fill: 'M24 7v10',
    lines: ['M24 12v30'],
    ellipses: [
      [18, 15, 3.2, 5],
      [30, 15, 3.2, 5],
      [16, 25, 3.2, 5],
      [32, 25, 3.2, 5],
      [18, 35, 3.2, 5],
      [30, 35, 3.2, 5],
    ],
  },
  bread: {
    fill: 'M8 23c0-7.5 7-13 16-13s16 5.5 16 13v15a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z',
    lines: ['M16 17l3 6', 'M24 15l3 6', 'M32 17l3 6'],
  },
  tube: {
    fill: 'M19 6h10v7l3.5 4.5a3 3 0 0 1 .5 1.7V40a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V19.2a3 3 0 0 1 .5-1.7L19 13z',
    lines: ['M19 13h10'],
  },
  utensil: {
    fill: 'M22.5 6v8.5a2.5 2.5 0 0 1-5 0V6h2.5v8h0-0z',
    lines: [
      'M20 6v14',
      'M13 6v7a4 4 0 0 0 4 4h0',
      'M35 6c-3 0-5 3-5 7s2 6 5 6v16',
      'M35 6v29',
    ],
  },
};

/** Six earthy tints; the tile background is the same colour at low opacity. */
const TINTS = {
  sage: '#7E968C',
  terracotta: '#C08A78',
  clay: '#B98A55',
  olive: '#8A9A5B',
  sky: '#7C93A8',
  sand: '#BFAE86',
} as const;

type TintName = keyof typeof TINTS;

export interface IngredientTile {
  /** Stable key stored on purchases and inventory rows. */
  key: string;
  label: string;
  keywords: string[];
  shape: ShapeName;
  tint: TintName;
}

export const INGREDIENT_TILES: IngredientTile[] = [
  { key: 'soy-sauce', label: 'Soy sauce', keywords: ['soy', 'soya', 'shoyu'], shape: 'bottle', tint: 'clay' },
  { key: 'olive-oil', label: 'Olive oil', keywords: ['olive', 'oil', 'evoo'], shape: 'bottle', tint: 'olive' },
  { key: 'cooking-oil', label: 'Cooking oil', keywords: ['oil', 'vegetable oil', 'sunflower', 'canola'], shape: 'bottle', tint: 'sand' },
  { key: 'vinegar', label: 'Vinegar', keywords: ['vinegar', 'balsamic', 'rice vinegar'], shape: 'bottle', tint: 'sage' },
  { key: 'salt', label: 'Salt', keywords: ['salt', 'sea salt'], shape: 'jar', tint: 'sand' },
  { key: 'sugar', label: 'Sugar', keywords: ['sugar', 'brown sugar', 'sweetener'], shape: 'bag', tint: 'sand' },
  { key: 'pepper', label: 'Pepper', keywords: ['pepper', 'peppercorn', 'black pepper'], shape: 'jar', tint: 'clay' },
  { key: 'sauce-jar', label: 'Sauce or spread', keywords: ['sauce', 'ketchup', 'mayonnaise', 'mayo', 'jam', 'honey', 'paste', 'mustard'], shape: 'jar', tint: 'terracotta' },
  { key: 'hot-sauce', label: 'Hot sauce', keywords: ['hot sauce', 'chilli sauce', 'chili sauce', 'sriracha', 'chilli oil', 'chili crisp'], shape: 'jar', tint: 'terracotta' },
  { key: 'oyster-sauce', label: 'Oyster sauce', keywords: ['oyster sauce'], shape: 'bottle', tint: 'clay' },
  { key: 'rice', label: 'Rice', keywords: ['rice', 'basmati', 'jasmine', 'grain'], shape: 'bag', tint: 'sand' },
  { key: 'noodles', label: 'Noodles & pasta', keywords: ['noodles', 'pasta', 'spaghetti', 'ramen', 'vermicelli', 'macaroni'], shape: 'bag', tint: 'olive' },
  { key: 'flour', label: 'Flour & baking', keywords: ['flour', 'baking', 'yeast', 'cornstarch'], shape: 'bag', tint: 'sand' },
  { key: 'bread', label: 'Bread', keywords: ['bread', 'loaf', 'bun', 'baguette', 'tortilla'], shape: 'bread', tint: 'clay' },
  { key: 'egg', label: 'Eggs', keywords: ['egg', 'eggs'], shape: 'egg', tint: 'sand' },
  { key: 'milk', label: 'Milk & cream', keywords: ['milk', 'cream', 'dairy'], shape: 'carton', tint: 'sky' },
  { key: 'yogurt', label: 'Yogurt', keywords: ['yogurt', 'yoghurt', 'curd'], shape: 'jar', tint: 'sky' },
  { key: 'butter', label: 'Butter', keywords: ['butter', 'margarine'], shape: 'box', tint: 'sand' },
  { key: 'cheese', label: 'Cheese', keywords: ['cheese', 'parmesan', 'cheddar'], shape: 'box', tint: 'clay' },
  { key: 'chicken', label: 'Chicken', keywords: ['chicken', 'poultry', 'drumstick', 'chicken leg'], shape: 'meat', tint: 'terracotta' },
  { key: 'chicken-thigh', label: 'Chicken thigh', keywords: ['chicken thigh', 'thigh', 'thighs', 'dark meat'], shape: 'meat', tint: 'terracotta' },
  { key: 'pork', label: 'Pork', keywords: ['pork', 'bacon', 'ham', 'sausage'], shape: 'meat', tint: 'terracotta' },
  { key: 'pork-belly', label: 'Pork belly', keywords: ['pork belly', 'belly pork', 'pork slices'], shape: 'meat', tint: 'terracotta' },
  { key: 'pork-rib', label: 'Pork ribs', keywords: ['pork rib', 'pork ribs', 'spare ribs', 'ribs'], shape: 'meat', tint: 'terracotta' },
  { key: 'beef', label: 'Beef', keywords: ['beef', 'lamb'], shape: 'meat', tint: 'terracotta' },
  { key: 'steak', label: 'Steak', keywords: ['steak', 'beef steak', 'sirloin', 'ribeye', 'rump'], shape: 'meat', tint: 'terracotta' },
  { key: 'ground-beef', label: 'Minced beef', keywords: ['minced beef', 'ground beef', 'beef mince', 'mince', 'ground meat'], shape: 'meat', tint: 'terracotta' },
  { key: 'fish', label: 'Fish', keywords: ['fish', 'salmon', 'tuna', 'cod'], shape: 'fish', tint: 'sky' },
  { key: 'seafood', label: 'Shellfish', keywords: ['shrimp', 'prawn', 'seafood', 'crab', 'squid'], shape: 'fish', tint: 'terracotta' },
  { key: 'tofu', label: 'Tofu', keywords: ['tofu', 'bean curd', 'tempeh'], shape: 'box', tint: 'sand' },
  { key: 'beans', label: 'Beans & lentils', keywords: ['beans', 'lentils', 'chickpeas', 'legumes'], shape: 'bag', tint: 'olive' },
  { key: 'tomato', label: 'Tomatoes', keywords: ['tomato', 'tomatoes'], shape: 'round', tint: 'terracotta' },
  { key: 'potato', label: 'Potatoes', keywords: ['potato', 'potatoes', 'yam'], shape: 'round', tint: 'clay' },
  { key: 'onion', label: 'Onions', keywords: ['onion', 'onions', 'shallot', 'red onion'], shape: 'round', tint: 'sand' },
  { key: 'green-onion', label: 'Green onions', keywords: ['green onion', 'spring onion', 'scallion', 'scallions'], shape: 'leaf', tint: 'olive' },
  { key: 'garlic', label: 'Garlic', keywords: ['garlic'], shape: 'round', tint: 'sage' },
  { key: 'ginger', label: 'Ginger', keywords: ['ginger'], shape: 'round', tint: 'clay' },
  { key: 'carrot', label: 'Carrots', keywords: ['carrot', 'carrots', 'radish'], shape: 'round', tint: 'terracotta' },
  { key: 'greens', label: 'Greens & veg', keywords: ['broccoli', 'spinach', 'kale', 'lettuce', 'cabbage', 'greens', 'vegetable', 'vegetables', 'celery'], shape: 'leaf', tint: 'olive' },
  { key: 'chinese-cabbage', label: 'Chinese cabbage', keywords: ['chinese cabbage', 'napa', 'napa cabbage', 'wombok', 'wong bok'], shape: 'leaf', tint: 'olive' },
  { key: 'bok-choy', label: 'Bok choy', keywords: ['bok choy', 'pak choi', 'bok choi', 'shanghai bok choy'], shape: 'leaf', tint: 'olive' },
  { key: 'choy-sum', label: 'Choy sum', keywords: ['choy sum', 'choi sum', 'flowering cabbage'], shape: 'leaf', tint: 'olive' },
  { key: 'ong-choy', label: 'Ong choy', keywords: ['ong choy', 'water spinach', 'kangkong', 'morning glory'], shape: 'leaf', tint: 'olive' },
  { key: 'chinese-chives', label: 'Chinese chives', keywords: ['chinese chives', 'garlic chives', 'chives', 'ku chai'], shape: 'leaf', tint: 'olive' },
  { key: 'asparagus', label: 'Asparagus', keywords: ['asparagus', 'spear', 'spears'], shape: 'leaf', tint: 'olive' },
  { key: 'bitter-melon', label: 'Bitter melon', keywords: ['bitter melon', 'bitter gourd', 'karela'], shape: 'round', tint: 'olive' },
  { key: 'dumpling', label: 'Dumplings', keywords: ['dumpling', 'dumplings', 'gyoza', 'wonton', 'jiaozi', 'potsticker'], shape: 'round', tint: 'sand' },
  { key: 'bao', label: 'Bao & buns', keywords: ['bao', 'bun', 'buns', 'steamed bun', 'mantou', 'baozi'], shape: 'round', tint: 'sand' },
  { key: 'mushroom', label: 'Mushrooms', keywords: ['mushroom', 'mushrooms'], shape: 'round', tint: 'sand' },
  { key: 'corn', label: 'Corn', keywords: ['corn', 'maize', 'sweetcorn'], shape: 'grain', tint: 'clay' },
  { key: 'chilli', label: 'Chilli & peppers', keywords: ['chilli', 'chili', 'pepper', 'capsicum', 'bell pepper'], shape: 'round', tint: 'terracotta' },
  { key: 'cucumber', label: 'Cucumber & squash', keywords: ['cucumber', 'zucchini', 'courgette', 'pumpkin', 'squash'], shape: 'round', tint: 'olive' },
  { key: 'avocado', label: 'Avocado', keywords: ['avocado'], shape: 'round', tint: 'olive' },
  { key: 'apple', label: 'Apples', keywords: ['apple', 'apples', 'pear'], shape: 'round', tint: 'terracotta' },
  { key: 'banana', label: 'Bananas', keywords: ['banana', 'bananas', 'plantain'], shape: 'round', tint: 'sand' },
  { key: 'orange', label: 'Oranges', keywords: ['orange', 'mandarin', 'tangerine', 'grapefruit'], shape: 'round', tint: 'clay' },
  { key: 'lemon', label: 'Lemons & limes', keywords: ['lemon', 'lime'], shape: 'round', tint: 'sand' },
  { key: 'berries', label: 'Berries & grapes', keywords: ['berries', 'berry', 'strawberry', 'blueberry', 'grape'], shape: 'round', tint: 'terracotta' },
  { key: 'nuts', label: 'Nuts & seeds', keywords: ['nuts', 'peanuts', 'almonds', 'cashews', 'walnuts', 'seeds'], shape: 'bag', tint: 'clay' },
  { key: 'frozen', label: 'Frozen food', keywords: ['frozen', 'ice cream', 'frozen food'], shape: 'box', tint: 'sky' },
  { key: 'canned', label: 'Canned & tinned', keywords: ['canned', 'tin', 'can', 'tinned', 'tomato paste'], shape: 'can', tint: 'sage' },
  { key: 'snacks', label: 'Snacks & biscuits', keywords: ['snacks', 'biscuits', 'cookies', 'chocolate', 'crisps', 'chips'], shape: 'box', tint: 'clay' },
  { key: 'drinks', label: 'Drinks', keywords: ['drinks', 'juice', 'soda', 'water', 'tea', 'coffee', 'beer', 'wine'], shape: 'bottle', tint: 'sky' },
  { key: 'detergent', label: 'Cleaning', keywords: ['detergent', 'laundry', 'soap', 'dish soap', 'cleaner', 'cleaning', 'bleach'], shape: 'bottle', tint: 'sky' },
  { key: 'paper', label: 'Paper goods', keywords: ['toilet paper', 'tissue', 'paper towel', 'paper', 'napkin'], shape: 'box', tint: 'sand' },
  { key: 'cleaning-tools', label: 'Sponges & cloths', keywords: ['sponge', 'scrub', 'cloth', 'mop', 'brush'], shape: 'box', tint: 'sage' },
  { key: 'utensils', label: 'Kitchenware', keywords: ['utensil', 'utensils', 'cutlery', 'spoon', 'fork', 'knife', 'kitchenware', 'plate', 'bowl', 'pot', 'pan'], shape: 'utensil', tint: 'sage' },
  { key: 'personal-care', label: 'Personal care', keywords: ['shampoo', 'toothpaste', 'soap bar', 'razor', 'lotion', 'personal care'], shape: 'tube', tint: 'terracotta' },
  { key: 'medicine', label: 'Medicine', keywords: ['medicine', 'pills', 'bandage', 'first aid', 'pharmacy'], shape: 'box', tint: 'terracotta' },
];

const TILE_BY_KEY = new Map(INGREDIENT_TILES.map((tile) => [tile.key, tile]));

/**
 * The picture for an item with none of its own: a plain drawn bag, kept out of
 * the searchable library so it is never offered as a real choice.
 */
export const NEUTRAL_TILE: IngredientTile = {
  key: 'unknown-item',
  label: 'Item',
  keywords: ['item'],
  shape: 'bag',
  tint: 'sage',
};

export function findIngredientTile(key: string | undefined): IngredientTile | undefined {
  if (!key) return undefined;
  return TILE_BY_KEY.get(key);
}

export function searchIngredientTiles(query: string, limit = 12): IngredientTile[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return INGREDIENT_TILES.slice(0, limit);

  return INGREDIENT_TILES.filter(
    (tile) =>
      tile.label.toLowerCase().includes(normalized) ||
      tile.key.includes(normalized) ||
      tile.keywords.some((keyword) => keyword.includes(normalized))
  ).slice(0, limit);
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * The tile a typed item name most likely means — used to preselect the right
 * picture when someone types "Kikkoman soya sauce" or "dish soap".
 *
 * Scored by words rather than raw substrings, so a specific match
 * ("soya sauce" → the soy-sauce bottle) beats a generic one ("sauce" → the
 * generic jar). Longer words are worth more, and a whole phrase match — the
 * label or a keyword appearing verbatim — is worth the most.
 */
export function guessIngredientTile(name: string): IngredientTile | undefined {
  const normalized = name.trim().toLowerCase();
  if (normalized.length < 2) return undefined;

  const nameWords = words(normalized);
  if (nameWords.length === 0) return undefined;

  let best: { tile: IngredientTile; score: number } | undefined;

  for (const tile of INGREDIENT_TILES) {
    const tileWords = new Set([...words(tile.label), ...tile.keywords.flatMap(words)]);

    let score = 0;
    for (const word of nameWords) {
      if (word.length >= 3 && tileWords.has(word)) score += word.length;
    }

    for (const phrase of [tile.label.toLowerCase(), ...tile.keywords]) {
      if (normalized.includes(phrase)) score += phrase.length;
    }

    if (score > 0 && (!best || score > best.score)) best = { tile, score };
  }

  return best?.tile;
}

/** The drawn tile itself: a soft tinted square with the item's silhouette. */
export function IngredientTileImage({
  tile,
  size = 40,
  testID,
}: {
  tile: IngredientTile;
  size?: number;
  testID?: string;
}) {
  const color = TINTS[tile.tint];
  const shape = SHAPES[tile.shape];

  return (
    <Svg testID={testID} width={size} height={size} viewBox="0 0 48 48">
      <Rect x={0} y={0} width={48} height={48} rx={Radius.large} fill={color} fillOpacity={0.18} />
      {shape.fill ? <Path d={shape.fill} fill={color} fillOpacity={shape.lines || shape.circles ? 0.9 : 1} /> : null}
      {shape.lines?.map((line) => (
        <Path key={line} d={line} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
      ))}
      {shape.circles?.map(([cx, cy, r]) => (
        <Circle key={`c-${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
      ))}
      {shape.ellipses?.map(([cx, cy, rx, ry]) => (
        <Ellipse key={`e-${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={color} />
      ))}
    </Svg>
  );
}

/**
 * A tile's picture: the photograph when one is bundled, the drawn tile
 * otherwise. Photographs sit on their own white square with a soft edge, in
 * either theme — like a product sticker on the card.
 */
export function IngredientPicture({
  tile,
  size = 40,
  testID,
}: {
  tile: IngredientTile;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const photo = findIngredientPhoto(tile.key);

  if (!photo) return <IngredientTileImage tile={tile} size={size} testID={testID} />;

  return (
    <Image
      testID={testID}
      accessibilityLabel={tile.label}
      source={photo}
      style={{
        width: size,
        height: size,
        borderRadius: Radius.large,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: '#FFFFFF',
      }}
    />
  );
}

/**
 * The picture for a purchase or pantry row: the stored tile when there is one,
 * the old emoji while version-1 data is still around, and a neutral tile
 * otherwise. Every screen uses this, so items look the same everywhere.
 */
export function IngredientImage({
  imageKey,
  icon,
  size = 40,
  testID,
}: {
  imageKey?: string;
  icon?: string;
  size?: number;
  testID?: string;
}) {
  const tile = findIngredientTile(imageKey);
  if (tile) return <IngredientPicture tile={tile} size={size} testID={testID} />;

  if (icon) {
    return (
      <ThemedText style={{ fontSize: size * 0.6, lineHeight: size }} testID={testID}>
        {icon}
      </ThemedText>
    );
  }

  return <IngredientTileImage tile={NEUTRAL_TILE} size={size} testID={testID} />;
}
