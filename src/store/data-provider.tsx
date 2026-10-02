import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useToast } from '@/components/ui/toast';
import { newId } from '@/lib/id';
import { buildSampleDB } from '@/store/sample-data';
import { loadDB, saveDB } from '@/store/storage';
import { purchaseStockChange, type PurchaseStockChange } from '@/store/selectors';
import {
  emptyDB,
  isEmptyDB,
  type DB,
  type Ingredient,
  type Meal,
  type NewIngredient,
  type NewMeal,
  type NewProject,
  type NewPurchase,
  type NewShoppingItem,
  type NewTask,
  type Note,
  type Project,
  type Purchase,
  type ShoppingItem,
  type Task,
} from '@/store/types';

export interface DataContextValue {
  /** False until the saved data has been read — screens wait for it. */
  ready: boolean;
  db: DB;

  addTask(input: NewTask): Task;
  updateTask(id: string, patch: Partial<Omit<Task, 'id'>>): void;
  deleteTask(id: string): void;
  /**
   * Ticks one day's appearance of a task. A repeating task remembers the days
   * it was done on; a one-off task just flips its single flag.
   */
  toggleTaskOn(id: string, date: string): void;

  addNote(text: string): Note;
  deleteNote(id: string): void;

  addProject(input: NewProject): Project;
  updateProject(id: string, patch: Partial<Omit<Project, 'id'>>): void;
  deleteProject(id: string): void;

  addPurchase(input: NewPurchase): Purchase;
  updatePurchase(id: string, patch: Partial<Omit<Purchase, 'id'>>): void;
  deletePurchase(id: string): void;

  addIngredient(input: NewIngredient): Ingredient;
  updateIngredient(id: string, patch: Partial<Omit<Ingredient, 'id'>>): void;
  deleteIngredient(id: string): void;
  /** Quick "+" / "−" stock adjustments; never goes below zero. */
  adjustIngredientQuantity(id: string, delta: number): void;

  addMeal(input: NewMeal): Meal;
  updateMeal(id: string, patch: Partial<Omit<Meal, 'id'>>): void;
  deleteMeal(id: string): void;

  addShoppingItem(input: NewShoppingItem): ShoppingItem;
  updateShoppingItem(id: string, patch: Partial<Omit<ShoppingItem, 'id'>>): void;
  deleteShoppingItem(id: string): void;
  toggleShoppingItem(id: string): void;
  clearDoneShopping(): void;

  /** Replaces everything — used only by Backup/Restore. */
  replaceAll(next: DB): void;
  /** Replaces everything with the example dataset (Backup & Restore dialog). */
  loadSampleData(): void;
  /** Clears every record, and stops the example data coming back on reload. */
  eraseAllData(): void;
}

/**
 * The example dataset is written once, into a completely empty store, so the
 * app opens with something to look at. Anything saved — including an
 * intentionally emptied app — turns it off for good.
 */
export const NO_SEED_KEY = 'dlailog:no-seed';

function seedingDisabledByBuild(): boolean {
  return process.env.EXPO_PUBLIC_DLAILOG_NO_SEED === '1';
}

async function shouldSeed(loaded: DB): Promise<boolean> {
  if (!isEmptyDB(loaded) || seedingDisabledByBuild()) return false;
  try {
    return (await AsyncStorage.getItem(NO_SEED_KEY)) !== '1';
  } catch {
    // Storage unavailable: an empty app is a fine place to start.
    return true;
  }
}

const DataContext = createContext<DataContextValue | null>(null);

function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Applies a purchase's effect on the pantry (create the item, or move its
 * quantity) to a database snapshot.
 */
function withStockChange(current: DB, change: PurchaseStockChange | null): DB {
  if (!change) return current;

  if (change.create) {
    const stamp = nowISO();
    const item: Ingredient = { ...change.create, id: newId(), createdAt: stamp, updatedAt: stamp };
    return { ...current, inventory: [...current.inventory, item] };
  }

  if (change.patch) {
    return {
      ...current,
      inventory: current.inventory.map((item) =>
        item.key === change.key ? { ...item, ...change.patch, updatedAt: nowISO() } : item
      ),
    };
  }

  return current;
}

/**
 * Holds the whole database in memory and saves it after every change.
 * Loading finishes before the first save can run, so an empty store can never
 * overwrite real data.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => emptyDB());
  const [ready, setReady] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    loadDB()
      .then(async (loaded) => ({
        loaded,
        seed: await shouldSeed(loaded),
      }))
      .then(({ loaded, seed }) => {
        if (cancelled) return;
        setDb(seed ? buildSampleDB() : loaded);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDB(db).catch(() => {
      showToast("Could not save your changes — check the browser's storage settings.");
    });
  }, [db, ready, showToast]);

  const mutate = useCallback((updater: (current: DB) => DB) => {
    setDb((current) => updater(current));
  }, []);

  // --- Tasks ---------------------------------------------------------------

  const addTask = useCallback(
    (input: NewTask) => {
      const task: Task = { ...input, id: newId(), createdAt: nowISO() };
      mutate((current) => ({ ...current, tasks: [...current.tasks, task] }));
      return task;
    },
    [mutate]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id'>>) => {
      mutate((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
      }));
    },
    [mutate]
  );

  const deleteTask = useCallback(
    (id: string) => {
      mutate((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
    },
    [mutate]
  );

  const toggleTaskOn = useCallback(
    (id: string, date: string) => {
      mutate((current) => ({
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== id) return task;

          if (!task.repeat) return { ...task, done: !task.done };

          const doneDates = task.doneDates ?? [];
          const next = doneDates.includes(date)
            ? doneDates.filter((day) => day !== date)
            : [...doneDates, date].sort();
          return { ...task, doneDates: next };
        }),
      }));
    },
    [mutate]
  );

  // --- Notes ---------------------------------------------------------------

  const addNote = useCallback(
    (text: string) => {
      const note: Note = { id: newId(), text, createdAt: nowISO() };
      mutate((current) => ({ ...current, notes: [...current.notes, note] }));
      return note;
    },
    [mutate]
  );

  const deleteNote = useCallback(
    (id: string) => {
      mutate((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
    },
    [mutate]
  );

  // --- Projects ------------------------------------------------------------

  const addProject = useCallback(
    (input: NewProject) => {
      const stamp = nowISO();
      const project: Project = { ...input, id: newId(), createdAt: stamp, updatedAt: stamp };
      mutate((current) => ({ ...current, projects: [...current.projects, project] }));
      return project;
    },
    [mutate]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Omit<Project, 'id'>>) => {
      mutate((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === id ? { ...project, ...patch, updatedAt: nowISO() } : project
        ),
      }));
    },
    [mutate]
  );

  const deleteProject = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        projects: current.projects.filter((project) => project.id !== id),
      }));
    },
    [mutate]
  );

  // --- Purchases (these also move the pantry) ------------------------------

  const addPurchase = useCallback(
    (input: NewPurchase) => {
      const purchase: Purchase = { ...input, id: newId(), createdAt: nowISO() };
      mutate((current) => {
        const withPurchase: DB = { ...current, purchases: [...current.purchases, purchase] };
        return withStockChange(withPurchase, purchaseStockChange(current.inventory, purchase, 1));
      });
      return purchase;
    },
    [mutate]
  );

  const updatePurchase = useCallback(
    (id: string, patch: Partial<Omit<Purchase, 'id'>>) => {
      mutate((current) => {
        const existing = current.purchases.find((purchase) => purchase.id === id);
        if (!existing) return current;

        const updated: Purchase = { ...existing, ...patch };
        let next: DB = {
          ...current,
          purchases: current.purchases.map((purchase) => (purchase.id === id ? updated : purchase)),
        };

        // Undo the old purchase's contribution, then apply the new one.
        next = withStockChange(next, purchaseStockChange(current.inventory, existing, -1));
        return withStockChange(next, purchaseStockChange(next.inventory, updated, 1));
      });
    },
    [mutate]
  );

  const deletePurchase = useCallback(
    (id: string) => {
      mutate((current) => {
        const purchase = current.purchases.find((entry) => entry.id === id);
        if (!purchase) return current;

        const next: DB = {
          ...current,
          purchases: current.purchases.filter((entry) => entry.id !== id),
        };
        return withStockChange(next, purchaseStockChange(current.inventory, purchase, -1));
      });
    },
    [mutate]
  );

  // --- Inventory -----------------------------------------------------------

  const addIngredient = useCallback(
    (input: NewIngredient) => {
      const stamp = nowISO();
      const ingredient: Ingredient = { ...input, id: newId(), createdAt: stamp, updatedAt: stamp };
      mutate((current) => ({ ...current, inventory: [...current.inventory, ingredient] }));
      return ingredient;
    },
    [mutate]
  );

  const updateIngredient = useCallback(
    (id: string, patch: Partial<Omit<Ingredient, 'id'>>) => {
      mutate((current) => ({
        ...current,
        inventory: current.inventory.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowISO() } : item
        ),
      }));
    },
    [mutate]
  );

  const deleteIngredient = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        inventory: current.inventory.filter((item) => item.id !== id),
      }));
    },
    [mutate]
  );

  const adjustIngredientQuantity = useCallback(
    (id: string, delta: number) => {
      mutate((current) => ({
        ...current,
        inventory: current.inventory.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.max(0, Math.round((item.quantity + delta) * 100) / 100),
                updatedAt: nowISO(),
              }
            : item
        ),
      }));
    },
    [mutate]
  );

  // --- Meals ---------------------------------------------------------------

  const addMeal = useCallback(
    (input: NewMeal) => {
      const stamp = nowISO();
      const meal: Meal = { ...input, id: newId(), createdAt: stamp, updatedAt: stamp };
      mutate((current) => ({ ...current, meals: [...current.meals, meal] }));
      return meal;
    },
    [mutate]
  );

  const updateMeal = useCallback(
    (id: string, patch: Partial<Omit<Meal, 'id'>>) => {
      mutate((current) => ({
        ...current,
        meals: current.meals.map((meal) =>
          meal.id === id ? { ...meal, ...patch, updatedAt: nowISO() } : meal
        ),
      }));
    },
    [mutate]
  );

  const deleteMeal = useCallback(
    (id: string) => {
      mutate((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== id) }));
    },
    [mutate]
  );

  // --- Shopping list -------------------------------------------------------

  const addShoppingItem = useCallback(
    (input: NewShoppingItem) => {
      const item: ShoppingItem = { ...input, id: newId(), createdAt: nowISO() };
      mutate((current) => {
        // Never queue the same item twice while it is still open.
        const alreadyOpen = current.shopping.some((entry) => entry.key === item.key && !entry.done);
        if (alreadyOpen) return current;
        return { ...current, shopping: [...current.shopping, item] };
      });
      return item;
    },
    [mutate]
  );

  const updateShoppingItem = useCallback(
    (id: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => {
      mutate((current) => ({
        ...current,
        shopping: current.shopping.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      }));
    },
    [mutate]
  );

  const deleteShoppingItem = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        shopping: current.shopping.filter((item) => item.id !== id),
      }));
    },
    [mutate]
  );

  const toggleShoppingItem = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        shopping: current.shopping.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item
        ),
      }));
    },
    [mutate]
  );

  const clearDoneShopping = useCallback(() => {
    mutate((current) => ({ ...current, shopping: current.shopping.filter((item) => !item.done) }));
  }, [mutate]);

  const replaceAll = useCallback(
    (next: DB) => {
      mutate(() => next);
    },
    [mutate]
  );

  const loadSampleData = useCallback(() => {
    AsyncStorage.removeItem(NO_SEED_KEY).catch(() => {});
    mutate(() => buildSampleDB());
  }, [mutate]);

  const eraseAllData = useCallback(() => {
    AsyncStorage.setItem(NO_SEED_KEY, '1').catch(() => {});
    mutate(() => emptyDB());
  }, [mutate]);

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      db,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskOn,
      addNote,
      deleteNote,
      addProject,
      updateProject,
      deleteProject,
      addPurchase,
      updatePurchase,
      deletePurchase,
      addIngredient,
      updateIngredient,
      deleteIngredient,
      adjustIngredientQuantity,
      addMeal,
      updateMeal,
      deleteMeal,
      addShoppingItem,
      updateShoppingItem,
      deleteShoppingItem,
      toggleShoppingItem,
      clearDoneShopping,
      replaceAll,
      loadSampleData,
      eraseAllData,
    }),
    [
      ready,
      db,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskOn,
      addNote,
      deleteNote,
      addProject,
      updateProject,
      deleteProject,
      addPurchase,
      updatePurchase,
      deletePurchase,
      addIngredient,
      updateIngredient,
      deleteIngredient,
      adjustIngredientQuantity,
      addMeal,
      updateMeal,
      deleteMeal,
      addShoppingItem,
      updateShoppingItem,
      deleteShoppingItem,
      toggleShoppingItem,
      clearDoneShopping,
      replaceAll,
      loadSampleData,
      eraseAllData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used inside <DataProvider>');
  }
  return context;
}
