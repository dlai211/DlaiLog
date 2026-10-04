/**
 * Translation between the app's records and the database's rows (PRD §32).
 *
 * The two disagree in four ways, and every one of them is handled here and
 * nowhere else:
 *
 *   - **Naming.** The app is camelCase (`itemName`), SQL is snake_case
 *     (`item_name`).
 *   - **Emptiness.** The app leaves a field out; SQL stores `null`. The
 *     conversion is deliberate in both directions: writing `undefined` as an
 *     explicit `null` is what makes *clearing* an optional field actually
 *     clear it, because a key that is simply absent tells the database
 *     "leave this column alone".
 *   - **Timestamps.** The app writes `2026-10-04T20:13:11.380Z`; PostgreSQL
 *     hands back `2026-10-04T20:13:11.380076+00:00`. Everything is normalised
 *     to the app's form on the way in, so nothing downstream has to know.
 *   - **Lists.** A `null` column and an empty list mean the same thing to the
 *     app (`repeat` is absent either way), so both are read as "absent".
 *     Without that, a value would flip between the two forms on every save
 *     and look like a change that needs writing.
 *
 * Everything in this file is a pure function of its argument, which is what
 * lets the whole translation be tested without a database.
 */

import { toUuid } from '@/lib/id';
import {
  emptyDB,
  type Category,
  type DB,
  type Ingredient,
  type Meal,
  type MealIngredient,
  type Note,
  type Project,
  type ProjectStatus,
  type Purchase,
  type ShoppingItem,
  type ShoppingSource,
  type Task,
  type Unit,
} from '@/store/types';

// --- the row shapes, exactly as the tables define them ----------------------

export interface TaskRow {
  id: string;
  title: string;
  date: string;
  time: string | null;
  end_time: string | null;
  note: string | null;
  done: boolean;
  repeat_days: number[] | null;
  repeat_until: string | null;
  done_dates: string[];
  created_at: string;
}

export interface NoteRow {
  id: string;
  text: string;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  target_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRow {
  id: string;
  date: string;
  item_name: string;
  image_key: string | null;
  icon: string | null;
  category: Category;
  amount: number;
  unit: Unit;
  total_price: number;
  savings: number | null;
  store: string;
  created_at: string;
}

export interface IngredientRow {
  id: string;
  name: string;
  key: string;
  image_key: string | null;
  icon: string | null;
  category: Category;
  quantity: number;
  unit: Unit;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface MealRow {
  id: string;
  name: string;
  photo: string | null;
  ingredients: MealIngredient[];
  steps: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingRow {
  id: string;
  name: string;
  key: string;
  amount: number | null;
  unit: Unit | null;
  source: ShoppingSource;
  source_label: string | null;
  done: boolean;
  created_at: string;
}

/** Every table, with its rows. The unit the diff and the network layer use. */
export interface RowSet {
  tasks: TaskRow[];
  notes: NoteRow[];
  projects: ProjectRow[];
  purchases: PurchaseRow[];
  inventory: IngredientRow[];
  meals: MealRow[];
  shopping: ShoppingRow[];
}

export type TableName = keyof RowSet;

/**
 * The table names in the order the app's own database lists them, so a
 * round trip through the cloud keeps every list in a predictable order.
 */
export const TABLE_NAMES: TableName[] = [
  'tasks',
  'notes',
  'projects',
  'purchases',
  'inventory',
  'meals',
  'shopping',
];

// --- small shared helpers ---------------------------------------------------

/** `null` becomes "not set", which is how the app stores it. */
function optional<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

/** A timestamp in the one shape the app uses everywhere. */
function timestamp(value: string): string {
  return new Date(value).toISOString();
}

/** A list column read as "absent" when it is empty. */
function optionalList<T>(value: T[] | null | undefined): T[] | undefined {
  return value && value.length > 0 ? [...value] : undefined;
}

// --- tasks ------------------------------------------------------------------

export function taskToRow(task: Task): TaskRow {
  return {
    id: toUuid(task.id),
    title: task.title,
    date: task.date,
    time: task.time ?? null,
    end_time: task.endTime ?? null,
    note: task.note ?? null,
    done: task.done,
    repeat_days: task.repeat?.days ?? null,
    repeat_until: task.repeat?.until ?? null,
    done_dates: task.doneDates ?? [],
    created_at: task.createdAt,
  };
}

export function rowToTask(row: TaskRow): Task {
  const days = optionalList(row.repeat_days);
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: optional(row.time),
    endTime: optional(row.end_time),
    note: optional(row.note),
    done: row.done,
    // A pattern with no days in it never comes back, so it is not a pattern.
    repeat: days ? { days: [...days].sort((a, b) => a - b), until: optional(row.repeat_until) } : undefined,
    doneDates: optionalList(row.done_dates),
    createdAt: timestamp(row.created_at),
  };
}

// --- notes ------------------------------------------------------------------

export function noteToRow(note: Note): NoteRow {
  return { id: toUuid(note.id), text: note.text, created_at: note.createdAt };
}

export function rowToNote(row: NoteRow): Note {
  return { id: row.id, text: row.text, createdAt: timestamp(row.created_at) };
}

// --- projects ---------------------------------------------------------------

export function projectToRow(project: Project): ProjectRow {
  return {
    id: toUuid(project.id),
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    progress: project.progress,
    target_date: project.targetDate ?? null,
    notes: project.notes ?? null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: optional(row.description),
    status: row.status,
    progress: row.progress,
    targetDate: optional(row.target_date),
    notes: optional(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

// --- purchases --------------------------------------------------------------

export function purchaseToRow(purchase: Purchase): PurchaseRow {
  return {
    id: toUuid(purchase.id),
    date: purchase.date,
    item_name: purchase.itemName,
    image_key: purchase.imageKey ?? null,
    icon: purchase.icon ?? null,
    category: purchase.category,
    amount: purchase.amount,
    unit: purchase.unit,
    total_price: purchase.totalPrice,
    savings: purchase.savings ?? null,
    store: purchase.store,
    created_at: purchase.createdAt,
  };
}

export function rowToPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    date: row.date,
    itemName: row.item_name,
    imageKey: optional(row.image_key),
    icon: optional(row.icon),
    category: row.category,
    amount: Number(row.amount),
    unit: row.unit,
    totalPrice: Number(row.total_price),
    savings: row.savings === null || row.savings === undefined ? undefined : Number(row.savings),
    store: row.store,
    createdAt: timestamp(row.created_at),
  };
}

// --- inventory --------------------------------------------------------------

export function ingredientToRow(item: Ingredient): IngredientRow {
  return {
    id: toUuid(item.id),
    name: item.name,
    key: item.key,
    image_key: item.imageKey ?? null,
    icon: item.icon ?? null,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    capacity: item.capacity ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function rowToIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    imageKey: optional(row.image_key),
    icon: optional(row.icon),
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    capacity: row.capacity === null || row.capacity === undefined ? undefined : Number(row.capacity),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

// --- meals ------------------------------------------------------------------

export function mealToRow(meal: Meal): MealRow {
  return {
    id: toUuid(meal.id),
    name: meal.name,
    photo: meal.photo ?? null,
    ingredients: meal.ingredients,
    steps: meal.steps,
    notes: meal.notes ?? null,
    created_at: meal.createdAt,
    updated_at: meal.updatedAt,
  };
}

export function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    name: row.name,
    photo: optional(row.photo),
    // jsonb arrives already parsed; a hand-edited row could still hold
    // something that is not a list, and a meal with no ingredients beats a
    // screen that cannot render.
    ingredients: Array.isArray(row.ingredients) ? (row.ingredients as MealIngredient[]) : [],
    steps: row.steps ?? '',
    notes: optional(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

// --- shopping ---------------------------------------------------------------

export function shoppingToRow(item: ShoppingItem): ShoppingRow {
  return {
    id: toUuid(item.id),
    name: item.name,
    key: item.key,
    amount: item.amount ?? null,
    unit: item.unit ?? null,
    source: item.source,
    source_label: item.sourceLabel ?? null,
    done: item.done,
    created_at: item.createdAt,
  };
}

export function rowToShopping(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    amount: row.amount === null || row.amount === undefined ? undefined : Number(row.amount),
    unit: optional(row.unit),
    source: row.source,
    sourceLabel: optional(row.source_label),
    done: row.done,
    createdAt: timestamp(row.created_at),
  };
}

// --- the whole database -----------------------------------------------------

/** The app's database, in the shape the tables want. */
export function dbToRows(db: DB): RowSet {
  return {
    tasks: db.tasks.map(taskToRow),
    notes: db.notes.map(noteToRow),
    projects: db.projects.map(projectToRow),
    purchases: db.purchases.map(purchaseToRow),
    inventory: db.inventory.map(ingredientToRow),
    meals: db.meals.map(mealToRow),
    shopping: db.shopping.map(shoppingToRow),
  };
}

/** The tables, back as the app's database. */
export function rowsToDb(rows: Partial<RowSet>): DB {
  return {
    ...emptyDB(),
    tasks: (rows.tasks ?? []).map(rowToTask),
    notes: (rows.notes ?? []).map(rowToNote),
    projects: (rows.projects ?? []).map(rowToProject),
    purchases: (rows.purchases ?? []).map(rowToPurchase),
    inventory: (rows.inventory ?? []).map(rowToIngredient),
    meals: (rows.meals ?? []).map(rowToMeal),
    shopping: (rows.shopping ?? []).map(rowToShopping),
  };
}
