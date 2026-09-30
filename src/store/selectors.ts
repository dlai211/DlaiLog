// Derived data — computed on the fly from the database, never stored.
// Each module's selectors live in their own section.

import { daysBetween, todayKey } from '@/lib/dates';
import type { Project, ProjectStatus, Task } from '@/store/types';

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
