import {
  doneTasksForDay,
  filterProjects,
  filterPurchases,
  groupPurchasesByDay,
  itemMemory,
  itemSuggestions,
  monthSummary,
  monthTotal,
  normalizeItemName,
  overdueTasks,
  projectDueLabel,
  recentIcons,
  sortProjects,
  storeSuggestions,
  storesInUse,
  tasksForDay,
  undoneTasksByDay,
} from '@/store/selectors';
import type { Project, Purchase, Task } from '@/store/types';

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

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pu1',
    date: '2026-09-28',
    itemName: 'Soy sauce',
    icon: '🍜',
    category: 'condiment',
    amount: 1,
    unit: 'L',
    totalPrice: 6.45,
    store: 'Asia Market',
    createdAt: '2026-09-28T10:00:00.000Z',
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

describe('normalizeItemName', () => {
  it('trims and lowercases so "Soy Sauce" and "soy sauce " are one item', () => {
    expect(normalizeItemName('  Soy Sauce ')).toBe('soy sauce');
  });
});

describe('filterPurchases', () => {
  const purchases = [
    makePurchase({ id: 'a', date: '2026-09-28', category: 'condiment', store: 'Asia Market' }),
    makePurchase({ id: 'b', date: '2026-09-15', itemName: 'Rice', category: 'grocery', store: 'SuperMart' }),
    makePurchase({ id: 'c', date: '2026-08-30', itemName: 'Sponges', category: 'misc', store: 'HomeShop' }),
  ];
  const base = { month: '2026-09', category: 'all' as const, store: 'all', search: '' };

  it('keeps only the chosen month', () => {
    expect(filterPurchases(purchases, base).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('narrows by category', () => {
    expect(filterPurchases(purchases, { ...base, category: 'grocery' }).map((p) => p.id)).toEqual(['b']);
  });

  it('narrows by store', () => {
    expect(filterPurchases(purchases, { ...base, store: 'Asia Market' }).map((p) => p.id)).toEqual(['a']);
  });

  it('searches item names case-insensitively', () => {
    expect(filterPurchases(purchases, { ...base, search: 'ric' }).map((p) => p.id)).toEqual(['b']);
    expect(filterPurchases(purchases, { ...base, search: 'zzz' })).toEqual([]);
  });

  it('combines filters', () => {
    expect(
      filterPurchases(purchases, { month: '2026-09', category: 'condiment', store: 'Asia Market', search: 'soy' }).map((p) => p.id)
    ).toEqual(['a']);
  });
});

describe('groupPurchasesByDay', () => {
  it('groups by day, newest day first, with day totals', () => {
    const groups = groupPurchasesByDay([
      makePurchase({ id: 'old', date: '2026-09-10', createdAt: '2026-09-10T10:00:00.000Z', totalPrice: 4 }),
      makePurchase({ id: 'new-a', date: '2026-09-20', createdAt: '2026-09-20T10:00:00.000Z', totalPrice: 6.45 }),
      makePurchase({ id: 'new-b', date: '2026-09-20', createdAt: '2026-09-20T18:00:00.000Z', totalPrice: 10.5 }),
    ]);

    expect(groups.map((group) => group.date)).toEqual(['2026-09-20', '2026-09-10']);
    expect(groups[0].dayTotal).toBe(16.95);
    expect(groups[0].purchases.map((p) => p.id)).toEqual(['new-b', 'new-a']);
    expect(groups[1].dayTotal).toBe(4);
  });

  it('rounds day totals to cents', () => {
    const groups = groupPurchasesByDay([
      makePurchase({ id: 'a', totalPrice: 0.1 }),
      makePurchase({ id: 'b', totalPrice: 0.2 }),
    ]);
    expect(groups[0].dayTotal).toBe(0.3);
  });
});

describe('monthSummary / monthTotal', () => {
  const purchases = [
    makePurchase({ id: 'a', date: '2026-09-28', totalPrice: 6.45, store: 'Asia Market', category: 'condiment' }),
    makePurchase({ id: 'b', date: '2026-09-15', totalPrice: 20, store: 'SuperMart', category: 'grocery' }),
    makePurchase({ id: 'c', date: '2026-08-30', totalPrice: 99, store: 'HomeShop', category: 'misc' }),
  ];

  it('totals only the chosen month', () => {
    expect(monthTotal(purchases, '2026-09')).toBe(26.45);
    expect(monthTotal(purchases, '2026-08')).toBe(99);
    expect(monthTotal(purchases, '2026-07')).toBe(0);
  });

  it('finds the top store and category by spend', () => {
    expect(monthSummary(purchases, '2026-09')).toEqual({
      total: 26.45,
      count: 2,
      topStore: 'SuperMart',
      topCategory: 'grocery',
    });
  });

  it('reports an empty month cleanly', () => {
    expect(monthSummary(purchases, '2026-07')).toEqual({ total: 0, count: 0 });
  });
});

describe('itemMemory / itemSuggestions', () => {
  const purchases = [
    makePurchase({ id: 'old', date: '2026-08-01', itemName: 'Soy sauce', totalPrice: 5.2, icon: '🍜', store: 'Asia Market' }),
    makePurchase({ id: 'new', date: '2026-09-28', itemName: 'soy sauce', totalPrice: 6.45, icon: '🍶', store: 'SuperMart' }),
    makePurchase({ id: 'rice', date: '2026-09-15', itemName: 'Rice', icon: '🍚', category: 'grocery', unit: 'kg', amount: 5 }),
  ];

  it('remembers the most recent purchase of each item', () => {
    const memory = itemMemory(purchases);
    expect(Object.keys(memory).sort()).toEqual(['rice', 'soy sauce']);
    expect(memory['soy sauce']).toMatchObject({
      name: 'soy sauce',
      icon: '🍶',
      store: 'SuperMart',
      lastPrice: 6.45,
      lastDate: '2026-09-28',
    });
  });

  it('suggests matches by prefix and skips the exact name', () => {
    expect(itemSuggestions(purchases, 'so').map((entry) => entry.name)).toEqual(['soy sauce']);
    expect(itemSuggestions(purchases, 'soy sauce')).toEqual([]);
    expect(itemSuggestions(purchases, '')).toEqual([]);
  });

  it('orders suggestions by most recent purchase', () => {
    const more = [
      ...purchases,
      makePurchase({ id: 'oil', date: '2026-09-29', itemName: 'Olive oil', totalPrice: 12 }),
    ];
    expect(itemSuggestions(more, 'o').map((entry) => entry.name)).toEqual(['Olive oil']);
  });
});

describe('storeSuggestions / storesInUse / recentIcons', () => {
  const purchases = [
    makePurchase({ id: 'a', store: 'SuperMart', icon: '🍜', date: '2026-09-01' }),
    makePurchase({ id: 'b', store: 'SuperMart', icon: '🍚', date: '2026-09-05' }),
    makePurchase({ id: 'c', store: 'Asia Market', icon: '🧽', date: '2026-09-10' }),
  ];

  it('suggests stores most-used first, skipping the exact input', () => {
    // Both "SuperMart" and "Asia Market" contain "ma"; the used-more-often one leads.
    expect(storeSuggestions(purchases, 'ma')).toEqual(['SuperMart', 'Asia Market']);
    expect(storeSuggestions(purchases, 'super')).toEqual(['SuperMart']);
    expect(storeSuggestions(purchases, 'SuperMart')).toEqual([]);
    expect(storeSuggestions(purchases, '')).toEqual(['SuperMart', 'Asia Market']);
  });

  it('lists the stores in use alphabetically', () => {
    expect(storesInUse(purchases)).toEqual(['Asia Market', 'SuperMart']);
  });

  it('lists the most recently used icons, newest first, without repeats', () => {
    expect(recentIcons(purchases)).toEqual(['🧽', '🍚', '🍜']);
    expect(recentIcons(purchases, 2)).toEqual(['🧽', '🍚']);
  });
});
