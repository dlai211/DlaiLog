// Every record type DlaiLog stores.
//
// Version 2 added the Meals, Inventory and Shopping records; version 1
// databases are migrated forward on load (see store/storage.ts).

export type Category = 'condiment' | 'grocery' | 'misc';
export type ProjectStatus = 'not-started' | 'in-progress' | 'done';
export type Unit = 'ml' | 'L' | 'g' | 'kg' | 'pcs' | 'pack';

/** A weekly pattern, e.g. every Tuesday and Thursday. */
export interface TaskRepeat {
  /** Weekdays the task comes back on: 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** The last day the pattern runs, `YYYY-MM-DD`. Without it, it never ends. */
  until?: string;
}

export interface Task {
  id: string;
  title: string;
  /**
   * The task's day — for a repeating task, the day the pattern starts.
   * Local calendar day, `YYYY-MM-DD`.
   */
  date: string;
  /** Optional time of day, `HH:MM`. */
  time?: string;
  /** Optional end of the time range, `HH:MM`. Only meaningful with `time`. */
  endTime?: string;
  note?: string;
  /** Whether a one-off task has been ticked off. Repeating tasks use `doneDates`. */
  done: boolean;
  /** Set for a task that comes back on a weekly pattern. */
  repeat?: TaskRepeat;
  /** The days a repeating task has been ticked off. */
  doneDates?: string[];
  createdAt: string;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  /** 0–100, snapshots of 5. */
  progress: number;
  /** Optional target day, `YYYY-MM-DD`. */
  targetDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  itemName: string;
  /** Ingredient tile key (the picture shown for this item). */
  imageKey?: string;
  /** Legacy emoji icon from version 1 data; still displayed when there is no tile. */
  icon?: string;
  category: Category;
  /** How much was bought, in `unit` (e.g. 2 L). */
  amount: number;
  unit: Unit;
  /** What was paid in total. */
  totalPrice: number;
  store: string;
  createdAt: string;
}

/** Something kept in the pantry — fed automatically by purchases. */
export interface Ingredient {
  id: string;
  name: string;
  /** Normalized identity — the same rule purchases use. */
  key: string;
  imageKey?: string;
  icon?: string;
  category: Category;
  /** Current amount in stock. */
  quantity: number;
  unit: Unit;
  createdAt: string;
  updatedAt: string;
}

export interface MealIngredient {
  id: string;
  name: string;
  key: string;
  amount?: number;
  unit?: Unit;
  /** Ingredient tile key, so the dish shows the same picture as the pantry. */
  imageKey?: string;
}

/** A dish: a picture, what goes in it, and how to cook it. */
export interface Meal {
  id: string;
  name: string;
  /** Data URL of the uploaded dish picture. */
  photo?: string;
  ingredients: MealIngredient[];
  steps: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ShoppingSource = 'inventory' | 'meal' | 'manual';

export interface ShoppingItem {
  id: string;
  name: string;
  key: string;
  amount?: number;
  unit?: Unit;
  source: ShoppingSource;
  /** Where it came from, e.g. the meal's name. */
  sourceLabel?: string;
  done: boolean;
  createdAt: string;
}

export interface DB {
  version: 3;
  tasks: Task[];
  notes: Note[];
  projects: Project[];
  purchases: Purchase[];
  inventory: Ingredient[];
  meals: Meal[];
  shopping: ShoppingItem[];
}

export const DB_VERSION = 3 as const;

/** True when every list is empty — a brand-new install. */
export function isEmptyDB(db: DB): boolean {
  return (
    db.tasks.length === 0 &&
    db.notes.length === 0 &&
    db.projects.length === 0 &&
    db.purchases.length === 0 &&
    db.inventory.length === 0 &&
    db.meals.length === 0 &&
    db.shopping.length === 0
  );
}

export function emptyDB(): DB {
  return {
    version: DB_VERSION,
    tasks: [],
    notes: [],
    projects: [],
    purchases: [],
    inventory: [],
    meals: [],
    shopping: [],
  };
}

/** Inputs accepted by the data actions (the store fills in ids/timestamps). */
export type NewTask = Omit<Task, 'id' | 'createdAt'>;
export type NewProject = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type NewPurchase = Omit<Purchase, 'id' | 'createdAt'>;
export type NewIngredient = Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>;
export type NewMeal = Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>;
export type NewShoppingItem = Omit<ShoppingItem, 'id' | 'createdAt'>;
