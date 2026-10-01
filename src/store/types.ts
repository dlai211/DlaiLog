// The four record types DlaiLog stores, exactly as specified in PRD §5.

export type Category = 'condiment' | 'grocery' | 'misc';
export type ProjectStatus = 'not-started' | 'in-progress' | 'done';
export type Unit = 'ml' | 'L' | 'g' | 'kg' | 'pcs' | 'pack';

export interface Task {
  id: string;
  title: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  /** Optional time of day, `HH:MM`. */
  time?: string;
  note?: string;
  done: boolean;
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
  /** A single emoji. */
  icon: string;
  category: Category;
  /** How much was bought, in `unit` (e.g. 2 L). */
  amount: number;
  unit: Unit;
  /** What was paid in total. */
  totalPrice: number;
  store: string;
  createdAt: string;
}

export interface DB {
  version: 1;
  tasks: Task[];
  notes: Note[];
  projects: Project[];
  purchases: Purchase[];
}

export const DB_VERSION = 1 as const;

export function emptyDB(): DB {
  return { version: DB_VERSION, tasks: [], notes: [], projects: [], purchases: [] };
}

/** Inputs accepted by the data actions (the store fills in id/createdAt/updatedAt). */
export type NewTask = Omit<Task, 'id' | 'createdAt'>;
export type NewProject = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type NewPurchase = Omit<Purchase, 'id' | 'createdAt'>;
