import {
  doneTasksForDay,
  filterProjects,
  overdueTasks,
  projectDueLabel,
  sortProjects,
  tasksForDay,
  undoneTasksByDay,
} from '@/store/selectors';
import type { Project, Task } from '@/store/types';

function makeProject(overrides: Partial<Project> = {}): Project {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'p1',
    name: 'Project',
    status: 'in-progress',
    progress: 40,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    date: '2026-09-30',
    done: false,
    createdAt: '2026-09-30T08:00:00.000Z',
    ...overrides,
  };
}

describe('projectDueLabel', () => {
  it('counts down the days', () => {
    expect(projectDueLabel('2026-10-03', '2026-09-30')).toEqual({ label: '3 days left', overdue: false });
    expect(projectDueLabel('2026-10-01', '2026-09-30')).toEqual({ label: 'Due tomorrow', overdue: false });
    expect(projectDueLabel('2026-09-30', '2026-09-30')).toEqual({ label: 'Due today', overdue: false });
  });

  it('flags past target dates as overdue', () => {
    expect(projectDueLabel('2026-09-28', '2026-09-30')).toEqual({ label: 'Overdue', overdue: true });
    expect(projectDueLabel('2026-09-29', '2026-09-30')).toEqual({ label: 'Overdue', overdue: true });
  });
});

describe('sortProjects', () => {
  it('puts finished projects at the end', () => {
    const done = makeProject({ id: 'done', status: 'done', targetDate: '2026-10-01' });
    const active = makeProject({ id: 'active', status: 'in-progress', targetDate: '2026-12-01' });

    expect(sortProjects([done, active]).map((project) => project.id)).toEqual(['active', 'done']);
  });

  it('orders active projects by soonest target date, undated ones last', () => {
    const far = makeProject({ id: 'far', targetDate: '2026-12-01' });
    const soon = makeProject({ id: 'soon', targetDate: '2026-10-05' });
    const undated = makeProject({ id: 'undated' });

    expect(sortProjects([undated, far, soon]).map((project) => project.id)).toEqual([
      'soon',
      'far',
      'undated',
    ]);
  });

  it('falls back to most recently updated for undated projects', () => {
    const older = makeProject({ id: 'older', updatedAt: '2026-09-01T00:00:00.000Z' });
    const newer = makeProject({ id: 'newer', updatedAt: '2026-09-20T00:00:00.000Z' });

    expect(sortProjects([older, newer]).map((project) => project.id)).toEqual(['newer', 'older']);
  });

  it('does not mutate its input', () => {
    const projects = [makeProject({ id: 'a', targetDate: '2026-10-01' }), makeProject({ id: 'b' })];
    const before = projects.map((project) => project.id);

    sortProjects(projects);
    expect(projects.map((project) => project.id)).toEqual(before);
  });
});

describe('filterProjects', () => {
  const active = makeProject({ id: 'active', status: 'in-progress' });
  const planning = makeProject({ id: 'planning', status: 'not-started' });
  const done = makeProject({ id: 'done', status: 'done' });

  it('keeps everything with "all"', () => {
    expect(filterProjects([active, planning, done], 'all')).toHaveLength(3);
  });

  it('keeps only unfinished projects with "active"', () => {
    expect(filterProjects([active, planning, done], 'active').map((p) => p.id)).toEqual([
      'active',
      'planning',
    ]);
  });

  it('keeps only finished projects with "done"', () => {
    expect(filterProjects([active, planning, done], 'done').map((p) => p.id)).toEqual(['done']);
  });
});

describe('tasksForDay', () => {
  it('splits timed and untimed open tasks, ignoring other days and finished ones', () => {
    const tasks = [
      makeTask({ id: 'late', time: '14:00' }),
      makeTask({ id: 'early', time: '09:00' }),
      makeTask({ id: 'anytime', time: undefined }),
      makeTask({ id: 'other-day', date: '2026-10-01' }),
      makeTask({ id: 'finished', done: true }),
    ];

    const { timed, anytime } = tasksForDay(tasks, '2026-09-30');

    expect(timed.map((task) => task.id)).toEqual(['early', 'late']);
    expect(anytime.map((task) => task.id)).toEqual(['anytime']);
  });

  it('orders untimed tasks by creation time', () => {
    const tasks = [
      makeTask({ id: 'later', createdAt: '2026-09-30T18:00:00.000Z' }),
      makeTask({ id: 'earlier', createdAt: '2026-09-30T07:00:00.000Z' }),
    ];

    expect(tasksForDay(tasks, '2026-09-30').anytime.map((task) => task.id)).toEqual([
      'earlier',
      'later',
    ]);
  });
});

describe('doneTasksForDay', () => {
  it('returns only the finished tasks of that day', () => {
    const tasks = [
      makeTask({ id: 'done-here', done: true }),
      makeTask({ id: 'open-here' }),
      makeTask({ id: 'done-elsewhere', done: true, date: '2026-10-01' }),
    ];

    expect(doneTasksForDay(tasks, '2026-09-30').map((task) => task.id)).toEqual(['done-here']);
  });
});

describe('overdueTasks', () => {
  it('lists unfinished tasks from earlier days, oldest first', () => {
    const tasks = [
      makeTask({ id: 'yesterday', date: '2026-09-29' }),
      makeTask({ id: 'last-week', date: '2026-09-23' }),
      makeTask({ id: 'today', date: '2026-09-30' }),
      makeTask({ id: 'old-but-done', date: '2026-09-20', done: true }),
    ];

    expect(overdueTasks(tasks, '2026-09-30').map((task) => task.id)).toEqual([
      'last-week',
      'yesterday',
    ]);
  });
});

describe('undoneTasksByDay', () => {
  it('groups the open tasks of a month by day, timed first', () => {
    const tasks = [
      makeTask({ id: 'untimed', date: '2026-09-30' }),
      makeTask({ id: 'timed', date: '2026-09-30', time: '08:00' }),
      makeTask({ id: 'mid-month', date: '2026-09-15' }),
      makeTask({ id: 'next-month', date: '2026-10-01' }),
      makeTask({ id: 'finished', date: '2026-09-30', done: true }),
    ];

    const byDay = undoneTasksByDay(tasks, '2026-09');

    expect(Object.keys(byDay).sort()).toEqual(['2026-09-15', '2026-09-30']);
    expect(byDay['2026-09-30'].map((task) => task.id)).toEqual(['timed', 'untimed']);
    expect(byDay['2026-09-15'].map((task) => task.id)).toEqual(['mid-month']);
  });
});
