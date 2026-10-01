import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useToast } from '@/components/ui/toast';
import { newId } from '@/lib/id';
import { loadDB, saveDB } from '@/store/storage';
import {
  emptyDB,
  type DB,
  type NewProject,
  type NewPurchase,
  type NewTask,
  type Note,
  type Project,
  type Purchase,
  type Task,
} from '@/store/types';

export interface DataContextValue {
  /** False until the saved data has been read — screens wait for it. */
  ready: boolean;
  db: DB;
  addTask(input: NewTask): Task;
  updateTask(id: string, patch: Partial<Omit<Task, 'id'>>): void;
  deleteTask(id: string): void;
  addNote(text: string): Note;
  deleteNote(id: string): void;
  addProject(input: NewProject): Project;
  updateProject(id: string, patch: Partial<Omit<Project, 'id'>>): void;
  deleteProject(id: string): void;
  addPurchase(input: NewPurchase): Purchase;
  updatePurchase(id: string, patch: Partial<Omit<Purchase, 'id'>>): void;
  deletePurchase(id: string): void;
  /** Replaces everything — used only by Backup/Restore. */
  replaceAll(next: DB): void;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * Holds the whole database in memory and saves it after every change
 * (PRD §7.1). Loading finishes before the first save can run, so an empty
 * store can never overwrite real data.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => emptyDB());
  const [ready, setReady] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    loadDB().then((loaded) => {
      if (cancelled) return;
      setDb(loaded);
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

  const addTask = useCallback(
    (input: NewTask) => {
      const task: Task = { ...input, id: newId(), createdAt: new Date().toISOString() };
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

  const addNote = useCallback(
    (text: string) => {
      const note: Note = { id: newId(), text, createdAt: new Date().toISOString() };
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

  const addProject = useCallback(
    (input: NewProject) => {
      const now = new Date().toISOString();
      const project: Project = { ...input, id: newId(), createdAt: now, updatedAt: now };
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
          project.id === id
            ? { ...project, ...patch, updatedAt: new Date().toISOString() }
            : project
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

  const addPurchase = useCallback(
    (input: NewPurchase) => {
      const purchase: Purchase = { ...input, id: newId(), createdAt: new Date().toISOString() };
      mutate((current) => ({ ...current, purchases: [...current.purchases, purchase] }));
      return purchase;
    },
    [mutate]
  );

  const updatePurchase = useCallback(
    (id: string, patch: Partial<Omit<Purchase, 'id'>>) => {
      mutate((current) => ({
        ...current,
        purchases: current.purchases.map((purchase) =>
          purchase.id === id ? { ...purchase, ...patch } : purchase
        ),
      }));
    },
    [mutate]
  );

  const deletePurchase = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        purchases: current.purchases.filter((purchase) => purchase.id !== id),
      }));
    },
    [mutate]
  );

  const replaceAll = useCallback(
    (next: DB) => {
      mutate(() => next);
    },
    [mutate]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      db,
      addTask,
      updateTask,
      deleteTask,
      addNote,
      deleteNote,
      addProject,
      updateProject,
      deleteProject,
      addPurchase,
      updatePurchase,
      deletePurchase,
      replaceAll,
    }),
    [
      ready,
      db,
      addTask,
      updateTask,
      deleteTask,
      addNote,
      deleteNote,
      addProject,
      updateProject,
      deleteProject,
      addPurchase,
      updatePurchase,
      deletePurchase,
      replaceAll,
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
