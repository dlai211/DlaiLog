import {
  biggestPriceMoves,
  categoryCounts,
  doneOccurrencesForDay,
  filterProjects,
  filterPurchases,
  findSimilarItemName,
  findSimilarStore,
  groceryItems,
  groupPurchasesByDay,
  homeSummary,
  ingredientNameSuggestions,
  isOutOfStock,
  isTaskDoneOn,
  itemMemory,
  itemSuggestions,
  lastPurchaseFor,
  looseKey,
  mealIngredientStatuses,
  missingIngredients,
  monthSummary,
  monthTotal,
  normalizeItemName,
  openOccurrenceCounts,
  openOccurrencesByDay,
  openOccurrencesForDay,
  overdueOccurrences,
  projectDueLabel,
  purchaseStockChange,
  recentTileKeys,
  shoppingCounts,
  shoppingSuggestions,
  sortInventory,
  sortProjects,
  storeSuggestions,
  storesInUse,
  taskOccursOn,
} from '@/store/selectors';
import {
  emptyDB,
  type Ingredient,
  type Meal,
  type MealIngredient,
  type Project,
  type Purchase,
  type Task,
  type Unit,
} from '@/store/types';

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

describe('openOccurrencesForDay', () => {
  it('splits timed and untimed open tasks, ignoring other days and finished ones', () => {
    const tasks = [
      makeTask({ id: 'late', time: '14:00' }),
      makeTask({ id: 'early', time: '09:00' }),
      makeTask({ id: 'anytime', time: undefined }),
      makeTask({ id: 'other-day', date: '2026-10-01' }),
      makeTask({ id: 'finished', done: true }),
    ];

    const { timed, anytime } = openOccurrencesForDay(tasks, '2026-09-30');

    expect(timed.map((occurrence) => occurrence.task.id)).toEqual(['early', 'late']);
    expect(anytime.map((occurrence) => occurrence.task.id)).toEqual(['anytime']);
    expect(timed[0].date).toBe('2026-09-30');
    expect(timed[0].done).toBe(false);
  });

  it('orders untimed tasks by creation time', () => {
    const tasks = [
      makeTask({ id: 'later', createdAt: '2026-09-30T18:00:00.000Z' }),
      makeTask({ id: 'earlier', createdAt: '2026-09-30T07:00:00.000Z' }),
    ];

    expect(
      openOccurrencesForDay(tasks, '2026-09-30').anytime.map((occurrence) => occurrence.task.id)
    ).toEqual(['earlier', 'later']);
  });
});

describe('doneOccurrencesForDay', () => {
  it('returns only the finished tasks of that day', () => {
    const tasks = [
      makeTask({ id: 'done-here', done: true }),
      makeTask({ id: 'open-here' }),
      makeTask({ id: 'done-elsewhere', done: true, date: '2026-10-01' }),
    ];

    expect(
      doneOccurrencesForDay(tasks, '2026-09-30').map((occurrence) => occurrence.task.id)
    ).toEqual(['done-here']);
  });
});

describe('overdueOccurrences', () => {
  it('lists unfinished tasks from earlier days, oldest first', () => {
    const tasks = [
      makeTask({ id: 'yesterday', date: '2026-09-29' }),
      makeTask({ id: 'last-week', date: '2026-09-23' }),
      makeTask({ id: 'today', date: '2026-09-30' }),
      makeTask({ id: 'old-but-done', date: '2026-09-20', done: true }),
    ];

    expect(overdueOccurrences(tasks, '2026-09-30').map((occurrence) => occurrence.task.id)).toEqual([
      'last-week',
      'yesterday',
    ]);
  });

  it('leaves repeating tasks out — a missed Tuesday is not a debt', () => {
    const tasks = [
      makeTask({ id: 'repeat', date: '2026-09-01', repeat: { days: [2] } }),
      makeTask({ id: 'one-off', date: '2026-09-29' }),
    ];

    expect(overdueOccurrences(tasks, '2026-09-30').map((occurrence) => occurrence.task.id)).toEqual([
      'one-off',
    ]);
  });
});

describe('openOccurrencesByDay', () => {
  it('groups the open tasks of a month by day, timed first', () => {
    const tasks = [
      makeTask({ id: 'untimed', date: '2026-09-30' }),
      makeTask({ id: 'timed', date: '2026-09-30', time: '08:00' }),
      makeTask({ id: 'mid-month', date: '2026-09-15' }),
      makeTask({ id: 'next-month', date: '2026-10-01' }),
      makeTask({ id: 'finished', date: '2026-09-30', done: true }),
    ];

    const byDay = openOccurrencesByDay(tasks, '2026-09');

    expect(Object.keys(byDay).sort()).toEqual(['2026-09-15', '2026-09-30']);
    expect(byDay['2026-09-30'].map((occurrence) => occurrence.task.id)).toEqual(['timed', 'untimed']);
    expect(byDay['2026-09-15'].map((occurrence) => occurrence.task.id)).toEqual(['mid-month']);
  });
});

describe('tasks that repeat', () => {
  // Every Tuesday and Thursday, starting Tue 6 Oct 2026, until the end of
  // October — the worked example from the requirements.
  const tueThu = makeTask({
    id: 'tue-thu',
    date: '2026-10-06',
    time: '12:00',
    endTime: '14:00',
    repeat: { days: [2, 4], until: '2026-10-31' },
  });

  it('lands on every matching weekday of its series', () => {
    expect(taskOccursOn(tueThu, '2026-10-06')).toBe(true); // Tuesday
    expect(taskOccursOn(tueThu, '2026-10-08')).toBe(true); // Thursday
    expect(taskOccursOn(tueThu, '2026-10-07')).toBe(false); // Wednesday
  });

  it('does not reach back before it starts, or past its end date', () => {
    expect(taskOccursOn(tueThu, '2026-09-29')).toBe(false); // Tuesday, before the start
    expect(taskOccursOn(tueThu, '2026-11-03')).toBe(false); // Tuesday, after the end
  });

  it('comes back every day when all seven days are chosen', () => {
    const daily = makeTask({ id: 'daily', date: '2026-09-28', repeat: { days: [0, 1, 2, 3, 4, 5, 6] } });
    expect(taskOccursOn(daily, '2026-09-28')).toBe(true);
    expect(taskOccursOn(daily, '2026-11-30')).toBe(true);
  });

  it('shows up on each of its days in the month view', () => {
    const byDay = openOccurrencesByDay([tueThu], '2026-10');
    expect(Object.keys(byDay).sort()).toEqual([
      '2026-10-06',
      '2026-10-08',
      '2026-10-13',
      '2026-10-15',
      '2026-10-20',
      '2026-10-22',
      '2026-10-27',
      '2026-10-29',
    ]);
  });

  it('is ticked off one day at a time', () => {
    const ticked = { ...tueThu, doneDates: ['2026-10-06'] };

    expect(isTaskDoneOn(ticked, '2026-10-06')).toBe(true);
    expect(isTaskDoneOn(ticked, '2026-10-08')).toBe(false);
    expect(
      openOccurrencesForDay([ticked], '2026-10-06').timed.map((occurrence) => occurrence.task.id)
    ).toEqual([]);
    expect(
      doneOccurrencesForDay([ticked], '2026-10-06').map((occurrence) => occurrence.task.id)
    ).toEqual(['tue-thu']);
    expect(
      openOccurrencesForDay([ticked], '2026-10-08').timed.map((occurrence) => occurrence.task.id)
    ).toEqual(['tue-thu']);
  });

  it('counts its appearances for the week strip’s dots', () => {
    const counts = openOccurrenceCounts([tueThu], ['2026-10-05', '2026-10-06', '2026-10-08']);

    expect(counts).toEqual({ '2026-10-05': 0, '2026-10-06': 1, '2026-10-08': 1 });
  });

  it('marks its occurrences as repeating, and one-off tasks as not', () => {
    const once = makeTask({ id: 'once' });
    const [repeatingOccurrence] = openOccurrencesForDay([tueThu], '2026-10-06').timed;
    const [onceOccurrence] = openOccurrencesForDay([once], '2026-09-30').anytime;

    expect(repeatingOccurrence.repeating).toBe(true);
    expect(onceOccurrence.repeating).toBe(false);
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

describe('storeSuggestions / storesInUse / recentTileKeys', () => {
  const purchases = [
    makePurchase({ id: 'a', store: 'SuperMart', imageKey: 'noodles', date: '2026-09-01' }),
    makePurchase({ id: 'b', store: 'SuperMart', imageKey: 'rice', date: '2026-09-05' }),
    makePurchase({ id: 'c', store: 'Asia Market', imageKey: 'cleaning-tools', date: '2026-09-10' }),
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

  it('lists the most recently used pictures, newest first, without repeats', () => {
    expect(recentTileKeys(purchases)).toEqual(['cleaning-tools', 'rice', 'noodles']);
    expect(recentTileKeys(purchases, 2)).toEqual(['cleaning-tools', 'rice']);
  });
});

describe('groceryItems', () => {
  it('groups purchases by item name and sorts the history oldest first', () => {
    const items = groceryItems([
      makePurchase({ id: 'sep', date: '2026-09-28', totalPrice: 6.45, amount: 1, unit: 'L' }),
      makePurchase({ id: 'jul', date: '2026-07-01', totalPrice: 5.2, amount: 1, unit: 'L' }),
      makePurchase({ id: 'rice', itemName: 'Rice', totalPrice: 10.5, amount: 5, unit: 'kg' }),
    ]);

    expect(items.map((item) => item.name)).toEqual(['Rice', 'Soy sauce']);
    const soy = items.find((item) => item.key === 'soy sauce')!;
    expect(soy.history.map((entry) => entry.id)).toEqual(['jul', 'sep']);
    expect(soy.history[0]).toMatchObject({ unitPrice: 5.2, store: 'Asia Market' });
  });

  it('computes the price statistics and the change against the previous purchase', () => {
    const items = groceryItems([
      makePurchase({ id: 'jul', date: '2026-07-01', totalPrice: 5.0, amount: 1, unit: 'L' }),
      makePurchase({ id: 'aug', date: '2026-08-01', totalPrice: 5.5, amount: 1, unit: 'L' }),
      makePurchase({ id: 'sep', date: '2026-09-28', totalPrice: 6.0, amount: 1, unit: 'L' }),
    ]);

    const soy = items[0];
    expect(soy.latestUnitPrice).toBeCloseTo(6.0);
    expect(soy.previousUnitPrice).toBeCloseTo(5.5);
    expect(soy.changePercent).toBeCloseTo(9.0909, 3);
    expect(soy.low).toBeCloseTo(5.0);
    expect(soy.high).toBeCloseTo(6.0);
    expect(soy.average).toBeCloseTo(5.5);
    expect(soy.totalSpent).toBeCloseTo(16.5);
  });

  it('computes unit price from amount, not just the total', () => {
    const items = groceryItems([
      makePurchase({ id: 'a', itemName: 'Rice', amount: 5, unit: 'kg', totalPrice: 10.5 }),
      makePurchase({ id: 'b', itemName: 'Rice', amount: 2, unit: 'kg', totalPrice: 5.0, date: '2026-09-29', createdAt: '2026-09-29T10:00:00.000Z' }),
    ]);

    expect(items[0].history[0].unitPrice).toBeCloseTo(2.1);
    expect(items[0].history[1].unitPrice).toBeCloseTo(2.5);
    expect(items[0].changePercent).toBeCloseTo(19.047, 2);
  });

  it('merges different spellings of the same item and follows the newest details', () => {
    const items = groceryItems([
      makePurchase({ id: 'old', date: '2026-08-01', itemName: 'soy sauce', icon: '🍜', store: 'Asia Market' }),
      makePurchase({
        id: 'new',
        date: '2026-09-28',
        itemName: 'Soy  Sauce',
        icon: '🍶',
        store: 'SuperMart',
        category: 'grocery',
      }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Soy Sauce');
    expect(items[0].icon).toBe('🍶');
    expect(items[0].category).toBe('grocery');
    expect(items[0].lastStore).toBe('SuperMart');
    expect(items[0].history).toHaveLength(2);
  });

  it('has no change for an item bought only once', () => {
    const items = groceryItems([makePurchase({ id: 'only' })]);
    expect(items[0].previousUnitPrice).toBeNull();
    expect(items[0].changePercent).toBeNull();
    expect(items[0].low).toBeCloseTo(items[0].high);
  });

  it('drops a deleted purchase from the history and statistics', () => {
    const all = [
      makePurchase({ id: 'a', date: '2026-08-01', totalPrice: 5 }),
      makePurchase({ id: 'b', date: '2026-09-28', totalPrice: 6 }),
    ];

    const before = groceryItems(all)[0];
    expect(before.history).toHaveLength(2);
    expect(before.changePercent).toBeCloseTo(20);

    const after = groceryItems(all.filter((purchase) => purchase.id !== 'b'))[0];
    expect(after.history).toHaveLength(1);
    expect(after.latestUnitPrice).toBeCloseTo(5);
    expect(after.changePercent).toBeNull();
  });
});

describe('categoryCounts / biggestPriceMoves', () => {
  it('counts the items in each category tab', () => {
    const items = groceryItems([
      makePurchase({ id: 'a' }),
      makePurchase({ id: 'b', itemName: 'Rice', category: 'grocery' }),
      makePurchase({ id: 'c', itemName: 'Sponges', category: 'misc' }),
      makePurchase({ id: 'd', itemName: 'Olive oil', category: 'grocery' }),
    ]);

    expect(categoryCounts(items)).toEqual({ condiment: 1, grocery: 2, misc: 1 });
  });

  it('surfaces the biggest price moves, ignoring tiny ones and first purchases', () => {
    const items = groceryItems([
      // +20%: 5 → 6
      makePurchase({ id: 'a1', itemName: 'Olive oil', date: '2026-08-01', totalPrice: 5 }),
      makePurchase({ id: 'a2', itemName: 'Olive oil', date: '2026-09-01', totalPrice: 6, createdAt: '2026-09-01T10:00:00.000Z' }),
      // -10%: 10 → 9
      makePurchase({ id: 'b1', itemName: 'Rice', date: '2026-08-01', totalPrice: 10 }),
      makePurchase({ id: 'b2', itemName: 'Rice', date: '2026-09-01', totalPrice: 9, createdAt: '2026-09-01T10:00:00.000Z' }),
      // 0%: no move
      makePurchase({ id: 'c1', itemName: 'Soy sauce', date: '2026-08-01', totalPrice: 6.45 }),
      makePurchase({ id: 'c2', itemName: 'Soy sauce', date: '2026-09-01', totalPrice: 6.45, createdAt: '2026-09-01T10:00:00.000Z' }),
      // single purchase: never a "move"
      makePurchase({ id: 'd1', itemName: 'Sponges', date: '2026-09-01' }),
    ]);

    expect(biggestPriceMoves(items).map((item) => item.name)).toEqual(['Olive oil', 'Rice']);
  });
});

describe('homeSummary', () => {
  const today = '2026-09-30';
  const month = '2026-09';
  const previousMonth = '2026-08';

  it('totals this month, compares with last month, and reports the top category', () => {
    const db = {
      ...emptyDB(),
      purchases: [
        makePurchase({ id: 'a', date: `${month}-10`, totalPrice: 30, category: 'grocery' }),
        makePurchase({ id: 'b', date: `${month}-20`, totalPrice: 10, category: 'condiment' }),
        makePurchase({ id: 'c', date: `${previousMonth}-10`, totalPrice: 20, category: 'grocery' }),
      ],
    };

    const summary = homeSummary(db, today);

    expect(summary.monthKey).toBe(month);
    expect(summary.monthTotal).toBe(40);
    expect(summary.previousMonthTotal).toBe(20);
    expect(summary.monthChangePercent).toBeCloseTo(100);
    expect(summary.purchaseCount).toBe(2);
    expect(summary.topCategory).toBe('grocery');
  });

  it('has no comparison when last month had no spending', () => {
    const db = { ...emptyDB(), purchases: [makePurchase({ id: 'a', date: `${month}-10` })] };
    expect(homeSummary(db, today).monthChangePercent).toBeNull();
  });

  it('lists up to three active projects, soonest target first', () => {
    const db = {
      ...emptyDB(),
      projects: [
        makeProject({ id: 'done', status: 'done', targetDate: '2026-10-01' }),
        makeProject({ id: 'far', targetDate: '2026-12-01' }),
        makeProject({ id: 'soon', targetDate: '2026-10-05' }),
        makeProject({ id: 'undated' }),
        makeProject({ id: 'later', targetDate: '2027-01-01' }),
      ],
    };

    expect(homeSummary(db, today).topProjects.map((project) => project.id)).toEqual([
      'soon',
      'far',
      'later',
    ]);
  });

  it('reports price moves only for items bought this month', () => {
    const db = {
      ...emptyDB(),
      purchases: [
        // This month's item with a big move.
        makePurchase({ id: 'm1', itemName: 'Olive oil', date: `${month}-01`, totalPrice: 5 }),
        makePurchase({ id: 'm2', itemName: 'Olive oil', date: `${month}-15`, totalPrice: 6, createdAt: `${month}-15T10:00:00.000Z` }),
        // Last month's item with an even bigger move — must not show up.
        makePurchase({ id: 'o1', itemName: 'Rice', date: `${previousMonth}-01`, totalPrice: 10 }),
        makePurchase({ id: 'o2', itemName: 'Rice', date: `${previousMonth}-20`, totalPrice: 20, createdAt: `${previousMonth}-20T10:00:00.000Z` }),
      ],
    };

    expect(homeSummary(db, today).priceMovers.map((item) => item.name)).toEqual(['Olive oil']);
  });

  it('is empty and safe on a brand-new database', () => {
    const summary = homeSummary(emptyDB(), today);
    expect(summary).toMatchObject({
      monthTotal: 0,
      previousMonthTotal: 0,
      monthChangePercent: null,
      purchaseCount: 0,
      topProjects: [],
      priceMovers: [],
    });
    expect(summary.topCategory).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pantry, meals and the shopping list
// ---------------------------------------------------------------------------

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'i1',
    name: 'Soy sauce',
    key: 'soy sauce',
    category: 'condiment',
    quantity: 1,
    unit: 'L',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'm1',
    name: 'Braised pork rice',
    ingredients: [],
    steps: '',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function mealIngredient(name: string, amount?: number, unit?: Unit): MealIngredient {
  return { id: `ing-${name}`, name, key: normalizeItemName(name), amount, unit };
}

describe('looseKey and the saved-name memory', () => {
  it('ignores case, spacing and punctuation', () => {
    expect(looseKey('Soy  Sauce-1')).toBe('soysauce1');
    expect(looseKey('soy_sauce')).toBe('soysauce');
  });

  it('recognises a near-miss spelling of a tracked item', () => {
    const purchases = [makePurchase({ itemName: 'Soy sauce' })];
    expect(findSimilarItemName(purchases, 'soy-sauce')).toBe('Soy sauce');
    expect(findSimilarItemName(purchases, 'SoySauce')).toBe('Soy sauce');
  });

  it('stays quiet for an exact spelling (it merges anyway) or something unrelated', () => {
    const purchases = [makePurchase({ itemName: 'Soy sauce' })];
    expect(findSimilarItemName(purchases, 'soy sauce')).toBeNull();
    expect(findSimilarItemName(purchases, 'rice')).toBeNull();
    expect(findSimilarItemName(purchases, 'so')).toBeNull();
  });

  it('does the same for store names', () => {
    const purchases = [makePurchase({ store: 'Asia Market' })];
    expect(findSimilarStore(purchases, 'asia-market')).toBe('Asia Market');
    expect(findSimilarStore(purchases, 'Asia Market')).toBeNull();
  });

  it('offers loose matches while typing, not just prefixes', () => {
    const purchases = [makePurchase({ itemName: 'Soy sauce' })];
    expect(itemSuggestions(purchases, 'soy').map((entry) => entry.name)).toEqual(['Soy sauce']);
    expect(itemSuggestions(purchases, 'sauce').map((entry) => entry.name)).toEqual(['Soy sauce']);
  });
});

describe('purchaseStockChange', () => {
  const purchase = makePurchase({ itemName: 'Soy sauce', amount: 1, unit: 'L' });

  it('creates a pantry row for an item that is new to it', () => {
    const change = purchaseStockChange([], purchase, 1);
    expect(change?.create).toMatchObject({
      name: 'Soy sauce',
      key: 'soy sauce',
      quantity: 1,
      unit: 'L',
      category: 'condiment',
    });
  });

  it('adds to the count when the units match', () => {
    const inventory = [makeIngredient({ quantity: 0.5, unit: 'L' })];
    expect(purchaseStockChange(inventory, purchase, 1)?.patch).toMatchObject({ quantity: 1.5 });
  });

  it('subtracts when a purchase is removed, never below zero', () => {
    const inventory = [makeIngredient({ quantity: 0.5, unit: 'L' })];
    expect(purchaseStockChange(inventory, makePurchase({ amount: 2 }), -1)?.patch).toMatchObject({
      quantity: 0,
    });
  });

  it('re-bases the count when the units do not line up', () => {
    const inventory = [makeIngredient({ quantity: 500, unit: 'ml' })];
    expect(purchaseStockChange(inventory, purchase, 1)?.patch).toMatchObject({
      quantity: 1,
      unit: 'L',
    });
  });

  it('does nothing when removing something the pantry never had', () => {
    expect(purchaseStockChange([], purchase, -1)).toBeNull();
  });
});

describe('inventory listing', () => {
  it('lists out-of-stock items first', () => {
    const items = [
      makeIngredient({ id: 'a', name: 'Rice', key: 'rice', quantity: 5 }),
      makeIngredient({ id: 'b', name: 'Olive oil', key: 'olive oil', quantity: 0 }),
      makeIngredient({ id: 'c', name: 'Butter', key: 'butter', quantity: 2 }),
    ];
    expect(sortInventory(items).map((item) => item.name)).toEqual(['Olive oil', 'Butter', 'Rice']);
    expect(isOutOfStock(items[1])).toBe(true);
    expect(isOutOfStock(items[0])).toBe(false);
  });

  it('finds the most recent purchase of an item', () => {
    const purchases = [
      makePurchase({ id: 'old', date: '2026-08-01', totalPrice: 5 }),
      makePurchase({ id: 'new', date: '2026-09-28', totalPrice: 6.45 }),
    ];
    expect(lastPurchaseFor(purchases, 'soy sauce')?.id).toBe('new');
    expect(lastPurchaseFor(purchases, 'rice')).toBeUndefined();
  });
});

describe('meals and the pantry', () => {
  const meal = makeMeal({
    ingredients: [mealIngredient('Soy sauce', 2, 'L'), mealIngredient('Pork belly', 500, 'g')],
  });

  it('labels each ingredient as in stock or missing', () => {
    const inventory = [makeIngredient({ key: 'soy sauce', quantity: 1 })];
    const statuses = mealIngredientStatuses(meal, inventory);

    expect(statuses[0]).toMatchObject({ inStock: true, stockQuantity: 1 });
    expect(statuses[1]).toMatchObject({ inStock: false, stockQuantity: 0 });
  });

  it('flags ingredients already waiting on the shopping list', () => {
    const shopping = [
      {
        id: 's1',
        name: 'Pork belly',
        key: 'pork belly',
        source: 'meal' as const,
        done: false,
        createdAt: '2026-09-30T08:00:00.000Z',
      },
    ];
    expect(mealIngredientStatuses(meal, [], shopping)[1].onShoppingList).toBe(true);
  });

  it('lists what is missing for a dish', () => {
    const inventory = [makeIngredient({ key: 'soy sauce', quantity: 1 })];
    expect(missingIngredients(meal, inventory).map((ingredient) => ingredient.name)).toEqual([
      'Pork belly',
    ]);
  });

  it('suggests ingredient names from the pantry and from purchase history', () => {
    const purchases = [makePurchase({ itemName: 'Soy sauce' })];
    const inventory = [makeIngredient({ name: 'Pork belly', key: 'pork belly' })];

    expect(ingredientNameSuggestions(purchases, inventory, 'so').map((entry) => entry.name)).toEqual([
      'Soy sauce',
    ]);
    expect(ingredientNameSuggestions(purchases, inventory, 'pork')).toEqual([
      { name: 'Pork belly', hint: 'in your pantry' },
    ]);
  });
});

describe('shoppingSuggestions', () => {
  const meal = makeMeal({ ingredients: [mealIngredient('Pork belly')] });

  it('offers pantry items that ran out and ingredients a meal needs', () => {
    const inventory = [
      makeIngredient({ key: 'soy sauce', name: 'Soy sauce', quantity: 0 }),
      makeIngredient({ id: 'rice', key: 'rice', name: 'Rice', quantity: 2 }),
    ];

    const suggestions = shoppingSuggestions(inventory, [meal], []);

    expect(suggestions.map((suggestion) => suggestion.name)).toEqual(['Soy sauce', 'Pork belly']);
    expect(suggestions[0]).toMatchObject({ kind: 'inventory' });
    expect(suggestions[1]).toMatchObject({ kind: 'meal', sourceLabel: 'Braised pork rice' });
  });

  it('leaves out anything already on the open list', () => {
    const inventory = [makeIngredient({ key: 'soy sauce', name: 'Soy sauce', quantity: 0 })];
    const shopping = [
      {
        id: 's1',
        name: 'Soy sauce',
        key: 'soy sauce',
        source: 'inventory' as const,
        done: false,
        createdAt: '2026-09-30T08:00:00.000Z',
      },
    ];

    expect(shoppingSuggestions(inventory, [], shopping)).toEqual([]);
  });

  it('counts open and bought items', () => {
    const base = {
      source: 'manual' as const,
      createdAt: '2026-09-30T08:00:00.000Z',
    };
    expect(
      shoppingCounts([
        { ...base, id: 's1', name: 'A', key: 'a', done: false },
        { ...base, id: 's2', name: 'B', key: 'b', done: true },
        { ...base, id: 's3', name: 'C', key: 'c', done: false },
      ])
    ).toEqual({ open: 2, done: 1 });
  });
});
