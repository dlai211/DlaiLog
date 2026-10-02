/**
 * The photographs for the ingredient library.
 *
 * These are the user's own pictures, prepared by
 * `node scripts/prepare-ingredient-images.mjs`: each one is squared, fitted on
 * white and saved at 256×256 in `assets/ingredients/`. The file name is the
 * ingredient key (see INGREDIENT_TILES), so adding a picture is: drop the
 * original in `images/`, run the script, and add its key here if it is new.
 *
 * They are bundled with the app — no internet needed, and nothing is
 * downloaded at runtime. Tiles without a photograph fall back to the drawn
 * pictures in ingredient-images.tsx.
 */
export const INGREDIENT_PHOTOS: Record<string, number> = {
  apple: require('@/assets/ingredients/apple.jpg'),
  asparagus: require('@/assets/ingredients/asparagus.jpg'),
  bao: require('@/assets/ingredients/bao.jpg'),
  'bitter-melon': require('@/assets/ingredients/bitter-melon.jpg'),
  'bok-choy': require('@/assets/ingredients/bok-choy.jpg'),
  carrot: require('@/assets/ingredients/carrot.jpg'),
  chicken: require('@/assets/ingredients/chicken-leg.jpg'),
  'chicken-thigh': require('@/assets/ingredients/chicken-thigh.jpg'),
  'chinese-cabbage': require('@/assets/ingredients/chinese-cabbage.jpg'),
  'chinese-chives': require('@/assets/ingredients/chinese-chives.jpg'),
  'choy-sum': require('@/assets/ingredients/choy-sum.jpg'),
  dumpling: require('@/assets/ingredients/dumpling.jpg'),
  egg: require('@/assets/ingredients/egg.jpg'),
  garlic: require('@/assets/ingredients/garlic.jpg'),
  ginger: require('@/assets/ingredients/ginger.jpg'),
  'green-onion': require('@/assets/ingredients/green-onion.jpg'),
  'ground-beef': require('@/assets/ingredients/ground-beef.jpg'),
  'hot-sauce': require('@/assets/ingredients/hot-sauce.jpg'),
  milk: require('@/assets/ingredients/milk.jpg'),
  mushroom: require('@/assets/ingredients/mushroom.jpg'),
  noodles: require('@/assets/ingredients/noodles.jpg'),
  'ong-choy': require('@/assets/ingredients/ong-choy.jpg'),
  onion: require('@/assets/ingredients/onion.jpg'),
  'oyster-sauce': require('@/assets/ingredients/oyster-sauce.jpg'),
  'pork-belly': require('@/assets/ingredients/pork-belly.jpg'),
  'pork-rib': require('@/assets/ingredients/pork-rib.jpg'),
  potato: require('@/assets/ingredients/potato.jpg'),
  rice: require('@/assets/ingredients/rice.jpg'),
  'soy-sauce': require('@/assets/ingredients/soy-sauce.jpg'),
  steak: require('@/assets/ingredients/steak.jpg'),
  tofu: require('@/assets/ingredients/tofu.jpg'),
  tomato: require('@/assets/ingredients/tomato.jpg'),
  vinegar: require('@/assets/ingredients/vinegar.jpg'),
};

export function findIngredientPhoto(key: string | undefined): number | undefined {
  if (!key) return undefined;
  return INGREDIENT_PHOTOS[key];
}
