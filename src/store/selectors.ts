// Derived data — computed on the fly from the database, never stored.
// Each module's selectors live in their own section.

import { daysBetween, monthKeyOf, shiftMonthKey, todayKey } from '@/lib/dates';
import type { Category, DB, Project, ProjectStatus, Purchase, Task, Unit } from '@/store/types';

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
  icon: string;
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

/** Items whose name starts with what has been typed, most recent first. */
export function itemSuggestions(purchases: Purchase[], prefix: string, limit = 5): ItemMemoryEntry[] {
  const query = normalizeItemName(prefix);
  if (!query) return [];

  return Object.entries(itemMemory(purchases))
    .filter(([key]) => key !== query && key.startsWith(query))
    .map(([, entry]) => entry)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit);
}

/** Stores whose name contains what has been typed, most used first. */
export function storeSuggestions(purchases: Purchase[], prefix: string, limit = 5): string[] {
  const query = prefix.trim().toLowerCase();
  const counts = new Map<string, number>();

  for (const purchase of purchases) {
    const store = purchase.store.trim();
    if (!store) continue;
    if (query && (!store.toLowerCase().includes(query) || store.toLowerCase() === query)) continue;
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

/** The icons used most recently, newest first — shown at the top of the picker. */
export function recentIcons(purchases: Purchase[], limit = 8): string[] {
  const sorted = [...purchases].sort((a, b) => (isNewerPurchase(a, b) ? -1 : 1));
  const icons: string[] = [];

  for (const purchase of sorted) {
    if (!purchase.icon || icons.includes(purchase.icon)) continue;
    icons.push(purchase.icon);
    if (icons.length >= limit) break;
  }
  return icons;
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
  icon: string;
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
