import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { ToastProvider } from '@/components/ui/toast';
import { DataProvider, useData, type DataContextValue } from '@/store/data-provider';
import { STORAGE_KEY } from '@/store/storage';
import { emptyDB, type NewPurchase, type Task } from '@/store/types';

let latest: DataContextValue | null = null;

function Probe() {
  const data = useData();
  useEffect(() => {
    latest = data;
  }, [data]);
  return (
    <>
      <Text testID="ready">{String(data.ready)}</Text>
      <Text testID="counts">
        {`${data.db.tasks.length}/${data.db.notes.length}/${data.db.projects.length}/${data.db.purchases.length}`}
      </Text>
    </>
  );
}

function renderProvider() {
  return render(
    <ToastProvider>
      <DataProvider>
        <Probe />
      </DataProvider>
    </ToastProvider>
  );
}

async function renderReady() {
  const view = renderProvider();
  await waitFor(() => expect(latest?.ready).toBe(true));
  return view;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Buy paint',
    date: '2026-09-30',
    done: false,
    createdAt: '2026-09-30T08:00:00.000Z',
    ...overrides,
  };
}

beforeEach(async () => {
  latest = null;
  await AsyncStorage.clear();
});

describe('DataProvider', () => {
  it('reports "not ready" first, then becomes ready with loaded data', async () => {
    renderProvider();
    expect(screen.getByTestId('ready')).toHaveTextContent('false');
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
  });

  it('loads existing saved data and never overwrites it with an empty store', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyDB(), tasks: [makeTask()] })
    );

    await renderReady();

    expect(screen.getByTestId('counts')).toHaveTextContent('1/0/0/0');
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string).tasks).toHaveLength(1);
  });
});

describe('tasks', () => {
  it('adds, updates and deletes', async () => {
    await renderReady();

    await act(async () => {
      latest!.addTask({ title: 'Buy paint', date: '2026-09-30', done: false });
    });
    expect(screen.getByTestId('counts')).toHaveTextContent('1/0/0/0');
    expect(latest!.db.tasks[0].id).toBeTruthy();

    await act(async () => {
      latest!.updateTask(latest!.db.tasks[0].id, { done: true, title: 'Buy paint (2 coats)' });
    });
    expect(latest!.db.tasks[0]).toMatchObject({ done: true, title: 'Buy paint (2 coats)' });

    await act(async () => {
      latest!.deleteTask(latest!.db.tasks[0].id);
    });
    expect(screen.getByTestId('counts')).toHaveTextContent('0/0/0/0');
  });
});

describe('notes', () => {
  it('adds and deletes', async () => {
    await renderReady();

    await act(async () => {
      latest!.addNote('Call plumber about sink');
    });
    expect(screen.getByTestId('counts')).toHaveTextContent('0/1/0/0');

    await act(async () => {
      latest!.deleteNote(latest!.db.notes[0].id);
    });
    expect(screen.getByTestId('counts')).toHaveTextContent('0/0/0/0');
  });
});

describe('projects', () => {
  it('adds with timestamps and updates with a new updatedAt', async () => {
    await renderReady();

    await act(async () => {
      latest!.addProject({ name: 'DlaiLog website', status: 'in-progress', progress: 40 });
    });
    const created = latest!.db.projects[0];
    expect(created.createdAt).toBe(created.updatedAt);

    await act(async () => {
      latest!.updateProject(created.id, { progress: 85 });
    });
    const updated = latest!.db.projects[0];
    expect(updated.progress).toBe(85);
    expect(updated.name).toBe('DlaiLog website');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime()
    );
  });

  it('deletes', async () => {
    await renderReady();
    await act(async () => {
      latest!.addProject({ name: 'Temp', status: 'not-started', progress: 0 });
    });
    await act(async () => {
      latest!.deleteProject(latest!.db.projects[0].id);
    });
    expect(screen.getByTestId('counts')).toHaveTextContent('0/0/0/0');
  });
});

describe('purchases', () => {
  it('stores every field of a purchase', async () => {
    await renderReady();

    await act(async () => {
      latest!.addPurchase({
        date: '2026-09-28',
        itemName: 'Soy sauce',
        icon: '🍜',
        category: 'condiment',
        amount: 1,
        unit: 'L',
        totalPrice: 6.45,
        store: 'Asia Market',
      });
    });

    expect(latest!.db.purchases[0]).toMatchObject({
      itemName: 'Soy sauce',
      icon: '🍜',
      category: 'condiment',
      amount: 1,
      unit: 'L',
      totalPrice: 6.45,
      store: 'Asia Market',
      date: '2026-09-28',
    });

    await act(async () => {
      latest!.updatePurchase(latest!.db.purchases[0].id, { totalPrice: 6.8, store: 'SuperMart' });
    });
    expect(latest!.db.purchases[0]).toMatchObject({ totalPrice: 6.8, store: 'SuperMart' });

    await act(async () => {
      latest!.deletePurchase(latest!.db.purchases[0].id);
    });
    expect(screen.getByTestId('counts')).toHaveTextContent('0/0/0/0');
  });
});

describe('replaceAll', () => {
  it('swaps the whole database (used by Restore)', async () => {
    await renderReady();

    await act(async () => {
      latest!.replaceAll({ ...emptyDB(), tasks: [makeTask({ id: 'restored-1' })] });
    });

    expect(screen.getByTestId('counts')).toHaveTextContent('1/0/0/0');
    expect(latest!.db.tasks[0].id).toBe('restored-1');
  });
});

describe('persistence', () => {
  it('survives a remount — the same as refreshing the browser', async () => {
    const view = await renderReady();

    await act(async () => {
      latest!.addProject({ name: 'DlaiLog website', status: 'in-progress', progress: 40 });
    });
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(raw).toContain('DlaiLog website');
    });

    view.unmount();
    latest = null;

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('0/0/1/0'));
    expect(latest!.db.projects[0].name).toBe('DlaiLog website');
    expect(latest!.db.projects[0].progress).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Pantry, meals and the shopping list
// ---------------------------------------------------------------------------

function soySaucePurchase(overrides: Partial<NewPurchase> = {}): NewPurchase {
  return {
    date: '2026-09-28',
    itemName: 'Soy sauce',
    imageKey: 'soy-sauce',
    category: 'condiment',
    amount: 1,
    unit: 'L',
    totalPrice: 6.45,
    store: 'Asia Market',
    ...overrides,
  };
}

describe('purchases move the pantry', () => {
  it('creates a pantry row for a new item, then adds to it', async () => {
    await renderReady();

    await act(async () => {
      latest!.addPurchase(soySaucePurchase());
    });
    expect(latest!.db.inventory).toHaveLength(1);
    expect(latest!.db.inventory[0]).toMatchObject({
      name: 'Soy sauce',
      quantity: 1,
      unit: 'L',
      imageKey: 'soy-sauce',
      category: 'condiment',
    });

    await act(async () => {
      latest!.addPurchase(soySaucePurchase({ amount: 2 }));
    });
    expect(latest!.db.inventory[0].quantity).toBe(3);
  });

  it('takes the amount back out when the purchase is deleted', async () => {
    await renderReady();
    await act(async () => {
      latest!.addPurchase(soySaucePurchase({ amount: 2 }));
    });

    await act(async () => {
      latest!.deletePurchase(latest!.db.purchases[0].id);
    });

    expect(latest!.db.inventory[0].quantity).toBe(0);
    expect(latest!.db.purchases).toHaveLength(0);
  });

  it('moves only the difference when a purchase is edited', async () => {
    await renderReady();
    await act(async () => {
      latest!.addPurchase(soySaucePurchase({ amount: 1 }));
    });

    await act(async () => {
      latest!.updatePurchase(latest!.db.purchases[0].id, { amount: 3 });
    });

    expect(latest!.db.inventory[0].quantity).toBe(3);
  });

  it('moves the stock to the new item when a purchase is renamed', async () => {
    await renderReady();
    await act(async () => {
      latest!.addPurchase(soySaucePurchase({ amount: 2 }));
    });

    await act(async () => {
      latest!.updatePurchase(latest!.db.purchases[0].id, { itemName: 'Rice' });
    });

    const byName = Object.fromEntries(latest!.db.inventory.map((item) => [item.name, item.quantity]));
    expect(byName).toEqual({ 'Soy sauce': 0, Rice: 2 });
  });
});

describe('inventory actions', () => {
  it('adds, edits and removes pantry items', async () => {
    await renderReady();

    await act(async () => {
      latest!.addIngredient({
        name: 'Olive oil',
        key: 'olive oil',
        category: 'condiment',
        quantity: 1,
        unit: 'L',
      });
    });
    expect(latest!.db.inventory).toHaveLength(1);

    await act(async () => {
      latest!.updateIngredient(latest!.db.inventory[0].id, { quantity: 2 });
    });
    expect(latest!.db.inventory[0].quantity).toBe(2);

    await act(async () => {
      latest!.deleteIngredient(latest!.db.inventory[0].id);
    });
    expect(latest!.db.inventory).toHaveLength(0);
  });

  it('adjusts with the +/- helper and never dips below zero', async () => {
    await renderReady();
    await act(async () => {
      latest!.addIngredient({
        name: 'Rice',
        key: 'rice',
        category: 'grocery',
        quantity: 5,
        unit: 'kg',
      });
    });
    const id = latest!.db.inventory[0].id;

    await act(async () => {
      latest!.adjustIngredientQuantity(id, -2.5);
    });
    expect(latest!.db.inventory[0].quantity).toBe(2.5);

    await act(async () => {
      latest!.adjustIngredientQuantity(id, -10);
    });
    expect(latest!.db.inventory[0].quantity).toBe(0);
  });
});

describe('shopping list', () => {
  it('does not queue the same item twice while it is still open', async () => {
    await renderReady();

    await act(async () => {
      latest!.addShoppingItem({ name: 'Soy sauce', key: 'soy sauce', source: 'inventory', done: false });
    });
    await act(async () => {
      latest!.addShoppingItem({ name: 'Soy sauce', key: 'soy sauce', source: 'meal', done: false });
    });

    expect(latest!.db.shopping).toHaveLength(1);
  });

  it('toggles items and clears only the bought ones', async () => {
    await renderReady();
    await act(async () => {
      latest!.addShoppingItem({ name: 'A', key: 'a', source: 'manual', done: false });
      latest!.addShoppingItem({ name: 'B', key: 'b', source: 'manual', done: false });
    });

    await act(async () => {
      latest!.toggleShoppingItem(latest!.db.shopping[0].id);
    });
    expect(latest!.db.shopping[0].done).toBe(true);

    await act(async () => {
      latest!.clearDoneShopping();
    });
    expect(latest!.db.shopping.map((item) => item.name)).toEqual(['B']);
  });
});

describe('meals', () => {
  it('adds, edits and deletes a dish with its ingredients', async () => {
    await renderReady();

    await act(async () => {
      latest!.addMeal({
        name: 'Braised pork rice',
        ingredients: [
          { id: 'ing-1', name: 'Soy sauce', key: 'soy sauce', amount: 2, unit: 'L' },
        ],
        steps: '1. Brown the pork',
      });
    });
    expect(latest!.db.meals[0]).toMatchObject({ name: 'Braised pork rice' });
    expect(latest!.db.meals[0].ingredients).toHaveLength(1);

    await act(async () => {
      latest!.updateMeal(latest!.db.meals[0].id, { steps: '1. Brown the pork\n2. Add the sauce' });
    });
    expect(latest!.db.meals[0].steps).toContain('Add the sauce');

    await act(async () => {
      latest!.deleteMeal(latest!.db.meals[0].id);
    });
    expect(latest!.db.meals).toHaveLength(0);
  });
});
