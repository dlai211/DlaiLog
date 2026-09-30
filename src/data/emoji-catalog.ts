/**
 * The built-in emoji list for purchase icons (PRD §5.4): no image files, no
 * dependencies — just a curated set of food and household emojis with the
 * keywords people would search for.
 */

export interface CatalogEmoji {
  emoji: string;
  keywords: string[];
}

const RAW_CATALOG: CatalogEmoji[] = [
  // Vegetables & greens
  { emoji: '🥦', keywords: ['broccoli', 'vegetable', 'greens'] },
  { emoji: '🥬', keywords: ['lettuce', 'cabbage', 'spinach', 'greens', 'vegetable'] },
  { emoji: '🥕', keywords: ['carrot', 'vegetable'] },
  { emoji: '🌽', keywords: ['corn', 'maize', 'vegetable'] },
  { emoji: '🥔', keywords: ['potato', 'vegetable'] },
  { emoji: '🍠', keywords: ['sweet potato', 'yam', 'vegetable'] },
  { emoji: '🍅', keywords: ['tomato', 'vegetable'] },
  { emoji: '🍆', keywords: ['eggplant', 'aubergine', 'vegetable'] },
  { emoji: '🥒', keywords: ['cucumber', 'vegetable'] },
  { emoji: '🫑', keywords: ['pepper', 'capsicum', 'bell pepper', 'vegetable'] },
  { emoji: '🌶️', keywords: ['chili', 'chilli', 'spicy', 'pepper'] },
  { emoji: '🧄', keywords: ['garlic', 'condiment', 'seasoning'] },
  { emoji: '🧅', keywords: ['onion', 'vegetable'] },
  { emoji: '🍄', keywords: ['mushroom', 'vegetable'] },
  { emoji: '🫛', keywords: ['peas', 'pea', 'vegetable'] },
  { emoji: '🥜', keywords: ['peanut', 'nuts', 'snack'] },
  { emoji: '🌰', keywords: ['chestnut', 'nuts'] },
  // Fruit
  { emoji: '🍎', keywords: ['apple', 'fruit'] },
  { emoji: '🍏', keywords: ['green apple', 'fruit'] },
  { emoji: '🍐', keywords: ['pear', 'fruit'] },
  { emoji: '🍊', keywords: ['orange', 'mandarin', 'tangerine', 'fruit'] },
  { emoji: '🍋', keywords: ['lemon', 'lime', 'fruit'] },
  { emoji: '🍌', keywords: ['banana', 'fruit'] },
  { emoji: '🍉', keywords: ['watermelon', 'fruit'] },
  { emoji: '🍇', keywords: ['grape', 'fruit'] },
  { emoji: '🍓', keywords: ['strawberry', 'berry', 'fruit'] },
  { emoji: '🫐', keywords: ['blueberry', 'berry', 'fruit'] },
  { emoji: '🍑', keywords: ['peach', 'fruit'] },
  { emoji: '🍍', keywords: ['pineapple', 'fruit'] },
  { emoji: '🥭', keywords: ['mango', 'fruit'] },
  { emoji: '🥝', keywords: ['kiwi', 'fruit'] },
  { emoji: '🍈', keywords: ['melon', 'fruit'] },
  { emoji: '🍒', keywords: ['cherry', 'cherries', 'fruit'] },
  { emoji: '🥥', keywords: ['coconut', 'fruit'] },
  { emoji: '🥑', keywords: ['avocado', 'fruit'] },
  // Meat, fish, eggs
  { emoji: '🥚', keywords: ['egg', 'eggs'] },
  { emoji: '🍗', keywords: ['chicken', 'poultry', 'meat', 'drumstick'] },
  { emoji: '🍖', keywords: ['meat', 'pork', 'ribs'] },
  { emoji: '🥩', keywords: ['beef', 'steak', 'meat'] },
  { emoji: '🥓', keywords: ['bacon', 'pork', 'meat'] },
  { emoji: '🌭', keywords: ['sausage', 'hot dog', 'meat'] },
  { emoji: '🍤', keywords: ['shrimp', 'prawn', 'seafood'] },
  { emoji: '🐟', keywords: ['fish', 'seafood'] },
  { emoji: '🦐', keywords: ['shrimp', 'prawn', 'seafood'] },
  { emoji: '🦀', keywords: ['crab', 'seafood'] },
  { emoji: '🦑', keywords: ['squid', 'calamari', 'seafood'] },
  { emoji: '🐚', keywords: ['shellfish', 'clam', 'seafood'] },
  // Grains, bread, staples
  { emoji: '🍚', keywords: ['rice', 'grain'] },
  { emoji: '🍙', keywords: ['rice ball', 'onigiri', 'grain'] },
  { emoji: '🍜', keywords: ['noodles', 'ramen', 'soy sauce', 'sauce', 'grain'] },
  { emoji: '🍝', keywords: ['pasta', 'spaghetti', 'noodles', 'grain'] },
  { emoji: '🍞', keywords: ['bread', 'loaf', 'bakery'] },
  { emoji: '🥖', keywords: ['baguette', 'bread', 'bakery'] },
  { emoji: '🥐', keywords: ['croissant', 'bread', 'bakery'] },
  { emoji: '🥯', keywords: ['bagel', 'bread', 'bakery'] },
  { emoji: '🫓', keywords: ['flatbread', 'pita', 'tortilla', 'bread'] },
  { emoji: '🥨', keywords: ['pretzel', 'snack', 'bakery'] },
  { emoji: '🍘', keywords: ['rice cracker', 'senbei', 'snack'] },
  { emoji: '🥣', keywords: ['cereal', 'oats', 'porridge', 'bowl'] },
  { emoji: '🌾', keywords: ['wheat', 'grain', 'flour'] },
  { emoji: '🫘', keywords: ['beans', 'lentils', 'legumes'] },
  // Dairy
  { emoji: '🥛', keywords: ['milk', 'dairy'] },
  { emoji: '🧈', keywords: ['butter', 'dairy'] },
  { emoji: '🧀', keywords: ['cheese', 'dairy'] },
  { emoji: '🍦', keywords: ['ice cream', 'soft serve', 'dessert', 'dairy'] },
  { emoji: '🍨', keywords: ['ice cream', 'dessert', 'dairy'] },
  { emoji: '🥥', keywords: ['coconut milk', 'coconut', 'dairy'] },
  // Condiments, sauces, seasoning — the "Condiment" category's staples
  { emoji: '🧂', keywords: ['salt', 'seasoning', 'condiment'] },
  { emoji: '🫙', keywords: ['jar', 'sauce', 'condiment', 'container'] },
  { emoji: '🍯', keywords: ['honey', 'syrup', 'condiment', 'sweetener'] },
  { emoji: '🥫', keywords: ['canned', 'tin', 'canned food', 'sauce'] },
  { emoji: '🫒', keywords: ['olive', 'olive oil', 'oil', 'condiment'] },
  { emoji: '🛢️', keywords: ['oil', 'cooking oil', 'barrel'] },
  { emoji: '🌿', keywords: ['herbs', 'parsley', 'basil', 'seasoning'] },
  { emoji: '🍋', keywords: ['lemon juice', 'juice', 'condiment'] },
  { emoji: '🥫', keywords: ['tomato paste', 'canned', 'sauce'] },
  { emoji: '🧉', keywords: ['vinegar', 'sauce', 'condiment'] },
  { emoji: '🍶', keywords: ['sake', 'soy sauce', 'sauce bottle', 'condiment'] },
  { emoji: '🫗', keywords: ['pouring', 'oil', 'sauce'] },
  { emoji: '🥄', keywords: ['spoon', 'utensil', 'cutlery'] },
  // Drinks
  { emoji: '💧', keywords: ['water', 'drink'] },
  { emoji: '🧃', keywords: ['juice box', 'juice', 'drink'] },
  { emoji: '🥤', keywords: ['soda', 'cup', 'drink'] },
  { emoji: '🧋', keywords: ['bubble tea', 'tea', 'drink'] },
  { emoji: '🍵', keywords: ['tea', 'green tea', 'drink'] },
  { emoji: '☕', keywords: ['coffee', 'drink'] },
  { emoji: '🍺', keywords: ['beer', 'drink'] },
  { emoji: '🍷', keywords: ['wine', 'drink'] },
  // Snacks & sweets
  { emoji: '🍫', keywords: ['chocolate', 'snack', 'sweet'] },
  { emoji: '🍬', keywords: ['candy', 'sweet', 'snack'] },
  { emoji: '🍪', keywords: ['cookie', 'biscuit', 'snack'] },
  { emoji: '🍩', keywords: ['donut', 'doughnut', 'snack'] },
  { emoji: '🍰', keywords: ['cake', 'dessert'] },
  { emoji: '🥧', keywords: ['pie', 'dessert'] },
  { emoji: '🍿', keywords: ['popcorn', 'snack'] },
  { emoji: '🥟', keywords: ['dumpling', 'gyoza', 'frozen food'] },
  { emoji: '🍤', keywords: ['fried shrimp', 'frozen food'] },
  { emoji: '🍱', keywords: ['bento', 'prepared meal', 'takeout'] },
  { emoji: '🍲', keywords: ['stew', 'soup', 'pot', 'prepared meal'] },
  // Household — cleaning
  { emoji: '🧴', keywords: ['bottle', 'lotion', 'shampoo', 'detergent', 'household'] },
  { emoji: '🧼', keywords: ['soap', 'cleaning', 'household'] },
  { emoji: '🧽', keywords: ['sponge', 'scouring', 'cleaning', 'household'] },
  { emoji: '🧹', keywords: ['broom', 'cleaning', 'household'] },
  { emoji: '🧺', keywords: ['basket', 'laundry', 'household'] },
  { emoji: '🪣', keywords: ['bucket', 'cleaning', 'household'] },
  { emoji: '🧻', keywords: ['toilet paper', 'paper towel', 'household'] },
  { emoji: '🗑️', keywords: ['trash bag', 'bin', 'garbage', 'household'] },
  { emoji: '🫧', keywords: ['bubbles', 'soap', 'cleaning'] },
  { emoji: '🧯', keywords: ['fire extinguisher', 'safety', 'household'] },
  // Kitchen & utensils
  { emoji: '🍽️', keywords: ['plate', 'utensils', 'dishes', 'kitchen'] },
  { emoji: '🍴', keywords: ['fork', 'knife', 'utensils', 'cutlery', 'kitchen'] },
  { emoji: '🥢', keywords: ['chopsticks', 'utensils', 'kitchen'] },
  { emoji: '🔪', keywords: ['knife', 'kitchen', 'utensils'] },
  { emoji: '🍳', keywords: ['pan', 'frying pan', 'kitchen', 'cookware'] },
  { emoji: '🥘', keywords: ['pan', 'wok', 'cookware', 'kitchen'] },
  { emoji: '🫕', keywords: ['pot', 'fondue', 'cookware', 'kitchen'] },
  { emoji: '🍵', keywords: ['cup', 'mug', 'kitchen'] },
  { emoji: '🥛', keywords: ['glass', 'cup', 'kitchen'] },
  { emoji: '🫖', keywords: ['teapot', 'kettle', 'kitchen'] },
  { emoji: '🧊', keywords: ['ice', 'ice cube', 'freezer'] },
  { emoji: '🥡', keywords: ['takeout box', 'container', 'leftovers'] },
  { emoji: '🧊', keywords: ['ice tray', 'freezer', 'kitchen'] },
  // Paper, batteries, odds and ends
  { emoji: '🧷', keywords: ['safety pin', 'stationery'] },
  { emoji: '📎', keywords: ['paperclip', 'stationery', 'office'] },
  { emoji: '✏️', keywords: ['pencil', 'stationery', 'office'] },
  { emoji: '🖊️', keywords: ['pen', 'stationery', 'office'] },
  { emoji: '📒', keywords: ['notebook', 'stationery', 'office'] },
  { emoji: '📌', keywords: ['pin', 'stationery', 'office'] },
  { emoji: '🔋', keywords: ['battery', 'batteries', 'household'] },
  { emoji: '💡', keywords: ['light bulb', 'bulb', 'household'] },
  { emoji: '🔌', keywords: ['plug', 'charger', 'cable', 'electronics'] },
  { emoji: '🔦', keywords: ['flashlight', 'torch', 'household'] },
  { emoji: '🪫', keywords: ['low battery', 'battery'] },
  // Personal care & health
  { emoji: '🧷', keywords: ['diaper pin', 'baby'] },
  { emoji: '🪥', keywords: ['toothbrush', 'toothpaste', 'personal care'] },
  { emoji: '🧴', keywords: ['sunscreen', 'body wash', 'personal care'] },
  { emoji: '💊', keywords: ['medicine', 'pill', 'pharmacy', 'health'] },
  { emoji: '🩹', keywords: ['bandage', 'plaster', 'first aid'] },
  { emoji: '🧻', keywords: ['tissue', 'tissues', 'personal care'] },
  { emoji: '🪒', keywords: ['razor', 'shaving', 'personal care'] },
  { emoji: '🧦', keywords: ['socks', 'clothing'] },
  { emoji: '👕', keywords: ['shirt', 'tshirt', 'clothing'] },
  { emoji: '🧢', keywords: ['cap', 'hat', 'clothing'] },
  { emoji: '🧤', keywords: ['gloves', 'clothing'] },
  { emoji: '🌂', keywords: ['umbrella', 'rain'] },
  // Plants & pets
  { emoji: '🪴', keywords: ['plant', 'potted plant', 'houseplant'] },
  { emoji: '🌱', keywords: ['seedling', 'seeds', 'plant'] },
  { emoji: '🌷', keywords: ['tulip', 'flowers'] },
  { emoji: '💐', keywords: ['bouquet', 'flowers'] },
  { emoji: '🐾', keywords: ['pet', 'paw', 'animal'] },
  { emoji: '🐱', keywords: ['cat', 'pet food', 'pet'] },
  { emoji: '🐶', keywords: ['dog', 'pet food', 'pet'] },
  { emoji: '🐦', keywords: ['bird', 'bird seed', 'pet'] },
  { emoji: '🐠', keywords: ['fish', 'aquarium', 'pet'] },
  // Other useful odds and ends
  { emoji: '📦', keywords: ['box', 'package', 'parcel', 'delivery'] },
  { emoji: '🎁', keywords: ['gift', 'present'] },
  { emoji: '🛍️', keywords: ['shopping bag', 'bag'] },
  { emoji: '🧸', keywords: ['teddy bear', 'toy', 'kids'] },
  { emoji: '🪀', keywords: ['toy', 'kids'] },
  { emoji: '🎈', keywords: ['balloon', 'party'] },
  { emoji: '🚿', keywords: ['shower', 'bathroom'] },
  { emoji: '🪞', keywords: ['mirror', 'bathroom'] },
  { emoji: '🛒', keywords: ['cart', 'trolley', 'groceries'] },
];

/** An emoji can appear under several groups — merge it into one entry. */
function dedupe(entries: CatalogEmoji[]): CatalogEmoji[] {
  const byEmoji = new Map<string, CatalogEmoji>();
  for (const entry of entries) {
    const existing = byEmoji.get(entry.emoji);
    if (existing) {
      existing.keywords = [...new Set([...existing.keywords, ...entry.keywords])];
    } else {
      byEmoji.set(entry.emoji, { emoji: entry.emoji, keywords: [...entry.keywords] });
    }
  }
  return [...byEmoji.values()];
}

export const EMOJI_CATALOG: CatalogEmoji[] = dedupe(RAW_CATALOG);

/** How many results the picker shows at once. */
export const EMOJI_RESULT_LIMIT = 24;

export function searchEmojis(query: string, limit = EMOJI_RESULT_LIMIT): CatalogEmoji[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return EMOJI_CATALOG.slice(0, limit);

  return EMOJI_CATALOG.filter((entry) =>
    entry.keywords.some((keyword) => keyword.includes(normalized))
  ).slice(0, limit);
}
