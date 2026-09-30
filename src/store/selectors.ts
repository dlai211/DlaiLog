// Derived data — computed on the fly from the database, never stored.
// Each module's selectors live in their own section.

import { daysBetween, todayKey } from '@/lib/dates';
import type { Project, ProjectStatus } from '@/store/types';

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
