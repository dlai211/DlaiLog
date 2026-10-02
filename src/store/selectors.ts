// Derived data — computed on the fly from the database, never stored.
// Each module's selectors live in their own section.

import { daysBetween, monthKeyOf, shiftMonthKey, todayKey } from '@/lib/dates';
import type {
  Category,
  DB,
  Ingredient,
  Meal,
  MealIngredient,
  Project,
  ProjectStatus,
  Purchase,
  ShoppingItem,
  Task,
  Unit,
} from '@/store/types';

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectFilter = 'all' | 'active' | 'done';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  done: 'Done',
};

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

/** Active projects first (soonest target date first), finished ones at the end. */
export function sortProjects(projects: Project[]): Project[] {
  const doneRank = (project: Project) => (project.status === 'done' ? 1 : 0);

  return [...projects].sort((a, b) => {
    if (doneRank(a) !== doneRank(b)) return doneRank(a) - doneRank(b);
    if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function filterProjects(projects: Project[], filter: ProjectFilter): Project[] {
  if (filter === 'active') return projects.filter((project) => project.status !== 'done');
  if (filter === 'done') return projects.filter((project) => project.status === 'done');
  return projects;
}

/** "3 days left" / "Overdue" / "Due today" — the target-date line on a card. */
export function projectDueLabel(
  targetDate: string,
  today: string = todayKey()
): { label: string; overdue: boolean } {
  const days = daysBetween(today, targetDate);
  if (days < 0) return { label: 'Overdue', overdue: true };
  if (days === 0) return { label: 'Due today', overdue: false };
  if (days === 1) return { label: 'Due tomorrow', overdue: false };
  return { label: `${days} days left`, overdue: false };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** Timed tasks first (earliest first), then untimed ones by creation order. */
function compareTasks(a: Task, b: Task): number {
  if (a.time && b.time) return a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt);
  if (a.time) return -1;
  if (b.time) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

/** The open tasks of one day, split into the Day view's two sections. */
export function tasksForDay(tasks: Task[], date: string): { timed: Task[]; anytime: Task[] } {
  const open = tasks.filter((task) => task.date === date && !task.done).sort(compareTasks);
  return {
    timed: open.filter((task) => Boolean(task.time)),
    anytime: open.filter((task) => !task.time),
  };
}

export function doneTasksForDay(tasks: Task[], date: string): Task[] {
  return tasks.filter((task) => task.date === date && task.done).sort(compareTasks);
}

/** Unfinished tasks from earlier days, oldest first. */
export function overdueTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .filter((task) => !task.done && task.date < today)
    .sort((a, b) => a.date.localeCompare(b.date) || compareTasks(a, b));
}

/** Open tasks of a month, grouped by day key — the Month view's chips. */
export function undoneTasksByDay(tasks: Task[], monthKey: string): Record<string, Task[]> {
  const byDay: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (task.done || !task.date.startsWith(monthKey)) continue;
    (byDay[task.date] ??= []).push(task);
  }
  for (const day of Object.keys(byDay)) {
    byDay[day].sort(compareTasks);
  }
  return byDay;
}

// ---------------------------------------------------------------------------
// Purchases (Spending) — the Grocery Tracker derives everything from these
// ---------------------------------------------------------------------------

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * An item's identity: trimmed, lowercased, inner whitespace squeezed to one
 * space — so "Soy  Sauce" and "soy sauce" are one item with one price history.
 */
export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type CategoryFilter = Category | 'all';

export interface SpendingFilters {
  /** `YYYY-MM` */
  month: string;
  category: CategoryFilter;
  /** 'all' or an exact store name */
  store: string;
  search: string;
}

export function filterPurchases(purchases: Purchase[], filters: SpendingFilters): Purchase[] {
  const search = filters.search.trim().toLowerCase();

  return purchases.filter((purchase) => {
    if (!purchase.date.startsWith(filters.month)) return false;
    if (filters.category !== 'all' && purchase.category !== filters.category) return false;
    if (filters.store !== 'all' && purchase.store !== filters.store) return false;
    if (search && !purchase.itemName.toLowerCase().includes(search)) return false;
    return true;
  });
}

export interface PurchaseDayGroup {
  date: string;
  purchases: Purchase[];
  dayTotal: number;
}

/** Newest day first; inside a day newest entry first, with the day's total. */
export function groupPurchasesByDay(purchases: Purchase[]): PurchaseDayGroup[] {
  const byDay = new Map<string, Purchase[]>();
  for (const purchase of purchases) {
    const list = byDay.get(purchase.date) ?? [];
    list.push(purchase);
    byDay.set(purchase.date, list);
  }

  return [...byDay.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      purchases: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      dayTotal: round2(list.reduce((sum, purchase) => sum + purchase.totalPrice, 0)),
    }));
}

export interface MonthSummary {
  total: number;
  count: number;
  topStore?: string;
  topCategory?: Category;
}

export function monthTotal(purchases: Purchase[], month: string): number {
  return round2(
    purchases
      .filter((purchase) => purchase.date.startsWith(month))
      .reduce((sum, purchase) => sum + purchase.totalPrice, 0)
  );
}

export function monthSummary(purchases: Purchase[], month: string): MonthSummary {
  const inMonth = purchases.filter((purchase) => purchase.date.startsWith(month));

  const byStore = new Map<string, number>();
  const byCategory = new Map<Category, number>();
  for (const purchase of inMonth) {
    byStore.set(purchase.store, (byStore.get(purchase.store) ?? 0) + purchase.totalPrice);
    byCategory.set(
      purchase.category,
      (byCategory.get(purchase.category) ?? 0) + purchase.totalPrice
    );
  }

  const topStore = [...byStore.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    total: round2(inMonth.reduce((sum, purchase) => sum + purchase.totalPrice, 0)),
    count: inMonth.length,
    topStore: topStore?.[0],
    topCategory: topCategory?.[0],
  };
}

export interface ItemMemoryEntry {
  /** Most recent spelling of the name. */
  name: string;
  /** Ingredient tile key, when the item has a picture. */
  imageKey?: string;
  /** Legacy emoji icon, kept for version-1 data. */
  icon?: string;
  category: Category;
  unit: Unit;
  store: string;
  lastPrice: number;
  lastDate: string;
}

function isNewerPurchase(candidate: Purchase, current: Purchase): boolean {
  if (candidate.date !== current.date) return candidate.date > current.date;
  return candidate.createdAt > current.createdAt;
}

/** Everything the app remembers about each item — the last time it was bought. */
export function itemMemory(purchases: Purchase[]): Record<string, ItemMemoryEntry> {
  const latest = new Map<string, Purchase>();
  for (const purchase of purchases) {
    const key = normalizeItemName(purchase.itemName);
    const current = latest.get(key);
    if (!current || isNewerPurchase(purchase, current)) {
      latest.set(key, purchase);
    }
  }

  const memory: Record<string, ItemMemoryEntry> = {};
  for (const [key, purchase] of latest) {
    memory[key] = {
      name: purchase.itemName.trim(),
      imageKey: purchase.imageKey,
      icon: purchase.icon,
      category: purchase.category,
      unit: purchase.unit,
      store: purchase.store,
      lastPrice: purchase.totalPrice,
      lastDate: purchase.date,
    };
  }
  return memory;
}

/**
 * A forgiving identity used to spot "the same thing, typed differently":
 * case, spacing and punctuation are ignored, so "soy-sauce", "Soy Sauce" and
 * "soysauce" all collapse to one key. `normalizeItemName` stays the stored
 * identity; this is only for recognising near-misses while typing.
 */
export function looseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Items matching what has been typed — names that start with it first, then
 * names that merely contain it (ignoring punctuation), each group most-recent
 * first. This is what stops "soy sauce" and "soy-sauce" becoming two items.
 */
export function itemSuggestions(purchases: Purchase[], prefix: string, limit = 5): ItemMemoryEntry[] {
  const query = normalizeItemName(prefix);
  if (!query) return [];

  const loose = looseKey(prefix);
  const entries = Object.entries(itemMemory(purchases)).filter(([key]) => key !== query);

  const prefixMatches = entries.filter(([key]) => key.startsWith(query));
  const looseMatches = entries.filter(
    ([key]) => !key.startsWith(query) && loose.length >= 3 && looseKey(key).includes(loose)
  );

  return [...prefixMatches, ...looseMatches]
    .map(([, entry]) => entry)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit);
}

/**
 * The saved name this typed name almost certainly means — e.g. typing
 * "soysauce" when "Soy sauce" is already tracked. Null when there is nothing
 * similar, or when the typed name already normalises to a known item (in
 * which case they merge anyway).
 */
export function findSimilarItemName(purchases: Purchase[], typed: string): string | null {
  const loose = looseKey(typed);
  if (loose.length < 3) return null;

  for (const entry of Object.values(itemMemory(purchases))) {
    if (looseKey(entry.name) === loose && normalizeItemName(entry.name) !== normalizeItemName(typed)) {
      return entry.name;
    }
  }
  return null;
}

/** Same idea as `findSimilarItemName`, for store names. */
export function findSimilarStore(purchases: Purchase[], typed: string): string | null {
  const loose = looseKey(typed);
  if (loose.length < 3) return null;

  for (const store of storesInUse(purchases)) {
    if (looseKey(store) === loose && normalizeItemName(store) !== normalizeItemName(typed)) {
      return store;
    }
  }
  return null;
}

/** Stores matching what has been typed (exact-ish first), most used first. */
export function storeSuggestions(purchases: Purchase[], prefix: string, limit = 5): string[] {
  const query = prefix.trim().toLowerCase();
  const loose = looseKey(prefix);
  const counts = new Map<string, number>();

  for (const purchase of purchases) {
    const store = purchase.store.trim();
    if (!store) continue;

    if (query) {
      const lowered = store.toLowerCase();
      const normalizedHit = lowered !== query && lowered.includes(query);
      const looseHit = loose.length >= 3 && looseKey(store) !== loose && looseKey(store).includes(loose);
      if (!normalizedHit && !looseHit) continue;
    }

    counts.set(store, (counts.get(store) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([store]) => store);
}

/** Every store that has been used, alphabetically. */
export function storesInUse(purchases: Purchase[]): string[] {
  return [...new Set(purchases.map((purchase) => purchase.store.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

/** The pictures used most recently, newest first — shown first in the picker. */
export function recentTileKeys(purchases: Purchase[], limit = 6): string[] {
  const sorted = [...purchases].sort((a, b) => (isNewerPurchase(a, b) ? -1 : 1));
  const keys: string[] = [];

  for (const purchase of sorted) {
    const key = purchase.imageKey;
    if (!key || keys.includes(key)) continue;
    keys.push(key);
    if (keys.length >= limit) break;
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Grocery Tracker — entirely derived from purchases, grouped by item name
// ---------------------------------------------------------------------------

export interface GroceryHistoryEntry {
  /** The purchase this line came from — "edit in Spending" uses it. */
  id: string;
  date: string;
  store: string;
  amount: number;
  unit: Unit;
  totalPrice: number;
  unitPrice: number;
}

export interface GroceryItem {
  /** Normalized item name — the item's identity. */
  key: string;
  /** Spelling from the most recent purchase. */
  name: string;
  /** Ingredient tile key from the most recent purchase. */
  imageKey?: string;
  /** Legacy emoji icon, kept for version-1 data. */
  icon?: string;
  /** Category of the most recent purchase. */
  category: Category;
  unit: Unit;
  /** Every purchase of this item, oldest first. */
  history: GroceryHistoryEntry[];
  latestUnitPrice: number;
  previousUnitPrice: number | null;
  /** Change from the previous purchase's unit price, in percent. */
  changePercent: number | null;
  low: number;
  high: number;
  average: number;
  totalSpent: number;
  lastDate: string;
  lastStore: string;
}

/**
 * The Grocery Tracker's whole dataset: one entry per item, with its price
 * history and statistics. Alphabetical, so the list is easy to scan.
 */
export function groceryItems(purchases: Purchase[]): GroceryItem[] {
  const groups = new Map<string, Purchase[]>();
  for (const purchase of purchases) {
    const key = normalizeItemName(purchase.itemName);
    const list = groups.get(key) ?? [];
    list.push(purchase);
    groups.set(key, list);
  }

  const items: GroceryItem[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) =>
      a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)
    );

    const history: GroceryHistoryEntry[] = sorted.map((purchase) => ({
      id: purchase.id,
      date: purchase.date,
      store: purchase.store,
      amount: purchase.amount,
      unit: purchase.unit,
      totalPrice: purchase.totalPrice,
      unitPrice: purchase.amount > 0 ? purchase.totalPrice / purchase.amount : 0,
    }));

    const prices = history.map((entry) => entry.unitPrice);
    const latest = sorted[sorted.length - 1];
    const latestUnitPrice = prices[prices.length - 1];
    const previousUnitPrice = prices.length > 1 ? prices[prices.length - 2] : null;
    const changePercent =
      previousUnitPrice !== null && previousUnitPrice > 0
        ? ((latestUnitPrice - previousUnitPrice) / previousUnitPrice) * 100
        : null;

    items.push({
      key,
      name: latest.itemName.trim().replace(/\s+/g, ' '),
      imageKey: latest.imageKey,
      icon: latest.icon,
      category: latest.category,
      unit: latest.unit,
      history,
      latestUnitPrice,
      previousUnitPrice,
      changePercent,
      low: Math.min(...prices),
      high: Math.max(...prices),
      average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalSpent: round2(sorted.reduce((sum, purchase) => sum + purchase.totalPrice, 0)),
      lastDate: latest.date,
      lastStore: latest.store,
    });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/** How many items sit in each category tab. */
export function categoryCounts(items: GroceryItem[]): Record<Category, number> {
  const counts: Record<Category, number> = { condiment: 0, grocery: 0, misc: 0 };
  for (const item of items) {
    counts[item.category] += 1;
  }
  return counts;
}

/** The items whose unit price rose or fell the most, biggest move first. */
export function biggestPriceMoves(items: GroceryItem[], limit = 3): GroceryItem[] {
  return items
    .filter((item) => item.changePercent !== null && Math.abs(item.changePercent) > 0.5)
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Home — one live summary of every module (PRD §3)
// ---------------------------------------------------------------------------

export interface HomeSummary {
  monthKey: string;
  monthTotal: number;
  previousMonthTotal: number;
  /** Change vs last month; null when last month had no spending. */
  monthChangePercent: number | null;
  purchaseCount: number;
  topCategory?: Category;
  /** Up to three active projects, soonest target date first. */
  topProjects: Project[];
  /** The items bought this month whose unit price moved most since before. */
  priceMovers: GroceryItem[];
}

export function homeSummary(db: DB, today: string = todayKey()): HomeSummary {
  const month = monthKeyOf(today);
  const previousMonth = shiftMonthKey(month, -1);

  const summary = monthSummary(db.purchases, month);
  const previousMonthTotal = monthTotal(db.purchases, previousMonth);

  const moversThisMonth = groceryItems(db.purchases).filter((item) =>
    item.lastDate.startsWith(month)
  );

  return {
    monthKey: month,
    monthTotal: summary.total,
    previousMonthTotal,
    monthChangePercent:
      previousMonthTotal > 0
        ? ((summary.total - previousMonthTotal) / previousMonthTotal) * 100
        : null,
    purchaseCount: summary.count,
    topCategory: summary.topCategory,
    topProjects: sortProjects(db.projects)
      .filter((project) => project.status !== 'done')
      .slice(0, 3),
    priceMovers: biggestPriceMoves(moversThisMonth, 3),
  };
}

// ---------------------------------------------------------------------------
// Inventory — stock that purchases feed automatically
// ---------------------------------------------------------------------------

/** Out-of-stock items first, then alphabetically. */
export function sortInventory(items: Ingredient[]): Ingredient[] {
  return [...items].sort((a, b) => {
    const aOut = a.quantity <= 0 ? 0 : 1;
    const bOut = b.quantity <= 0 ? 0 : 1;
    if (aOut !== bOut) return aOut - bOut;
    return a.name.localeCompare(b.name);
  });
}

export function isOutOfStock(item: Ingredient): boolean {
  return item.quantity <= 0;
}

/** The most recent purchase of an item, for "last bought / last price" lines. */
export function lastPurchaseFor(purchases: Purchase[], itemKey: string): Purchase | undefined {
  return purchases
    .filter((purchase) => normalizeItemName(purchase.itemName) === itemKey)
    .sort((a, b) => (isNewerPurchase(a, b) ? -1 : 1))[0];
}

export interface PurchaseStockChange {
  key: string;
  /** Patch for an existing inventory row… */
  patch?: Partial<Ingredient>;
  /** …or the row to create when the item is new to the pantry. */
  create?: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;
}

/**
 * Finds the pantry row an item name refers to.
 *
 * The first pass is exact (the stored key); the second forgives the ways the
 * same thing gets typed differently — "soy-sauce", "Soy  Sauce" and
 * "soysauce" all land on the same row instead of piling up as new items.
 */
export function findInventoryItem(inventory: Ingredient[], name: string): Ingredient | undefined {
  const key = normalizeItemName(name);
  const exact = inventory.find((item) => item.key === key);
  if (exact) return exact;

  const loose = looseKey(name);
  if (loose.length < 3) return undefined;
  return inventory.find((item) => looseKey(item.key) === loose);
}

/**
 * How a purchase changes the pantry. `direction` is +1 when the purchase is
 * added (or edited into its new form) and −1 when it is removed (or edited
 * away from its old form).
 *
 * Rules, kept deliberately simple and explainable:
 *   - a brand-new item appears in the pantry with the bought amount;
 *   - matching units add up (and subtract on removal, never below zero);
 *   - when the units don't line up, a purchase re-bases the count in its own
 *     unit instead of guessing a conversion.
 */
export function purchaseStockChange(
  inventory: Ingredient[],
  purchase: Purchase,
  direction: 1 | -1
): PurchaseStockChange | null {
  const key = normalizeItemName(purchase.itemName);
  const existing = findInventoryItem(inventory, purchase.itemName);

  if (!existing) {
    if (direction < 0) return null;
    return {
      key,
      create: {
        name: purchase.itemName.trim().replace(/\s+/g, ' '),
        key,
        imageKey: purchase.imageKey,
        icon: purchase.icon,
        category: purchase.category,
        quantity: purchase.amount,
        unit: purchase.unit,
      },
    };
  }

  // The patch always targets the row that was actually matched, so a purchase
  // typed as "soy-sauce" still moves the pantry's "Soy sauce".
  const targetKey = existing.key;

  if (existing.unit !== purchase.unit) {
    if (direction < 0) return null;
    return {
      key: targetKey,
      patch: {
        quantity: purchase.amount,
        unit: purchase.unit,
        imageKey: purchase.imageKey ?? existing.imageKey,
        icon: purchase.icon ?? existing.icon,
        category: purchase.category,
      },
    };
  }

  const nextQuantity =
    direction > 0
      ? round2(existing.quantity + purchase.amount)
      : Math.max(0, round2(existing.quantity - purchase.amount));

  return direction > 0
    ? {
        key: targetKey,
        patch: {
          quantity: nextQuantity,
          imageKey: purchase.imageKey ?? existing.imageKey,
          icon: purchase.icon ?? existing.icon,
        },
      }
    : { key: targetKey, patch: { quantity: nextQuantity } };
}

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------

export interface MealIngredientStatus {
  ingredient: MealIngredient;
  inStock: boolean;
  stockQuantity: number;
  onShoppingList: boolean;
}

/** Whether each ingredient of a dish is currently in the pantry. */
export function mealIngredientStatuses(
  meal: Meal,
  inventory: Ingredient[],
  shopping: ShoppingItem[] = []
): MealIngredientStatus[] {
  return meal.ingredients.map((ingredient) => {
    const stock = inventory.find((item) => item.key === ingredient.key);
    const quantity = stock?.quantity ?? 0;
    return {
      ingredient,
      inStock: quantity > 0,
      stockQuantity: quantity,
      onShoppingList: shopping.some((item) => item.key === ingredient.key && !item.done),
    };
  });
}

/** The ingredients a dish calls for that the pantry cannot cover. */
export function missingIngredients(meal: Meal, inventory: Ingredient[], shopping: ShoppingItem[] = []): MealIngredient[] {
  return mealIngredientStatuses(meal, inventory, shopping)
    .filter((status) => !status.inStock)
    .map((status) => status.ingredient);
}

/**
 * Names to offer while typing an ingredient: everything in the pantry plus
 * everything ever bought, so a dish and a purchase use the same spelling.
 */
export function ingredientNameSuggestions(
  purchases: Purchase[],
  inventory: Ingredient[],
  prefix: string,
  limit = 5
): { name: string; hint?: string }[] {
  const query = normalizeItemName(prefix);
  if (!query) return [];

  const loose = looseKey(prefix);
  const names = new Map<string, string>();
  for (const item of inventory) names.set(item.key, item.name);
  for (const entry of Object.values(itemMemory(purchases))) {
    const key = normalizeItemName(entry.name);
    if (!names.has(key)) names.set(key, entry.name);
  }

  const entries = [...names.entries()].filter(([key]) => key !== query);
  const prefixHits = entries.filter(([key]) => key.startsWith(query));
  const looseHits = entries.filter(
    ([key]) => !key.startsWith(query) && loose.length >= 3 && looseKey(key).includes(loose)
  );

  return [...prefixHits, ...looseHits].slice(0, limit).map(([key, name]) => ({
    name,
    hint: inventory.some((item) => item.key === key) ? 'in your pantry' : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------

export interface ShoppingSuggestion {
  kind: 'inventory' | 'meal';
  name: string;
  key: string;
  amount?: number;
  unit?: Unit;
  sourceLabel?: string;
  imageKey?: string;
  icon?: string;
}

/**
 * What could go on the shopping list: pantry items that have run out, plus
 * ingredients missing for any saved dish. Anything already on the list (and
 * not yet ticked off) is left out.
 */
export function shoppingSuggestions(
  inventory: Ingredient[],
  meals: Meal[],
  shopping: ShoppingItem[]
): ShoppingSuggestion[] {
  const open = new Set(shopping.filter((item) => !item.done).map((item) => item.key));
  const suggestions: ShoppingSuggestion[] = [];

  for (const item of sortInventory(inventory)) {
    if (!isOutOfStock(item) || open.has(item.key)) continue;
    suggestions.push({
      kind: 'inventory',
      name: item.name,
      key: item.key,
      unit: item.unit,
      imageKey: item.imageKey,
      icon: item.icon,
    });
  }

  for (const meal of meals) {
    for (const ingredient of meal.ingredients) {
      if (open.has(ingredient.key)) continue;
      if (suggestions.some((suggestion) => suggestion.key === ingredient.key)) continue;
      const stock = inventory.find((item) => item.key === ingredient.key);
      if ((stock?.quantity ?? 0) > 0) continue;
      suggestions.push({
        kind: 'meal',
        name: ingredient.name,
        key: ingredient.key,
        amount: ingredient.amount,
        unit: ingredient.unit,
        sourceLabel: meal.name,
        imageKey: stock?.imageKey,
        icon: stock?.icon,
      });
    }
  }

  return suggestions;
}

export function shoppingCounts(items: ShoppingItem[]): { open: number; done: number } {
  const done = items.filter((item) => item.done).length;
  return { open: items.length - done, done };
}
