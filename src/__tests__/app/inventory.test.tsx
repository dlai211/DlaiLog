import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import InventoryScreen from '@/app/inventory';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type DB, type Ingredient, type Meal, type ShoppingItem } from '@/store/types';

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'i1',
    name: 'Soy sauce',
    key: 'soy sauce',
    imageKey: 'soy-sauce',
    category: 'condiment',
    quantity: 1,
    unit: 'L',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function makeShoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 's1',
    name: 'Soy sauce',
    key: 'soy sauce',
    source: 'inventory',
    done: false,
    createdAt: '2026-09-30T08:00:00.000Z',
    ...overrides,
  };
}

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'm1',
    name: 'Braised pork rice',
    ingredients: [{ id: 'ing1', name: 'Pork belly', key: 'pork belly' }],
    steps: '',
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

async function seed(partial: Partial<DB>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), ...partial }));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Inventory — stock', () => {
  it('lists what is in the pantry with its stock level', async () => {
    await seed({
      inventory: [
        makeIngredient({ id: 'i1', name: 'Soy sauce', quantity: 1.5, unit: 'L' }),
        makeIngredient({ id: 'i2', name: 'Olive oil', key: 'olive oil', quantity: 0, unit: 'L' }),
      ],
      purchases: [
        {
          id: 'pu1',
          date: '2026-09-28',
          itemName: 'Soy sauce',
          category: 'condiment',
          amount: 1,
          unit: 'L',
          totalPrice: 6.45,
          store: 'Asia Market',
          createdAt: '2026-09-28T10:00:00.000Z',
        },
      ],
    });

    await renderScreen(<InventoryScreen />);

    await waitFor(() => expect(screen.getByTestId('stock-name-i1')).toHaveTextContent('Soy sauce'));
    expect(screen.getByTestId('stock-qty-i1')).toHaveTextContent('1.5 L');
    // Out-of-stock items are labelled and sorted first.
    expect(screen.getByTestId('stock-out-i2')).toHaveTextContent('Out of stock');
    expect(screen.getByTestId('stock-name-i2')).toHaveTextContent('Olive oil');
    expect(screen.getByText(/last bought Sep 28 · \$6\.45 at Asia Market/)).toBeOnTheScreen();
  });

  it('adjusts the quantity with the − and + buttons, never below zero', async () => {
    await seed({ inventory: [makeIngredient({ id: 'i1', quantity: 1, unit: 'L' })] });
    await renderScreen(<InventoryScreen />);
    await waitFor(() => expect(screen.getByTestId('stock-qty-i1')).toBeOnTheScreen());

    // Litres move in halves.
    fireEvent.press(screen.getByTestId('stock-inc-i1'));
    await waitFor(() => expect(screen.getByTestId('stock-qty-i1')).toHaveTextContent('1.5 L'));

    fireEvent.press(screen.getByTestId('stock-dec-i1'));
    await waitFor(() => expect(screen.getByTestId('stock-qty-i1')).toHaveTextContent('1 L'));

    fireEvent.press(screen.getByTestId('stock-dec-i1'));
    fireEvent.press(screen.getByTestId('stock-dec-i1'));
    await waitFor(() => expect(screen.getByTestId('stock-qty-i1')).toHaveTextContent('0 L'));
    expect(screen.getByTestId('stock-out-i1')).toBeOnTheScreen();
  });

  it('filters the list by search', async () => {
    await seed({
      inventory: [
        makeIngredient({ id: 'i1', name: 'Soy sauce' }),
        makeIngredient({ id: 'i2', name: 'Rice', key: 'rice' }),
      ],
    });
    await renderScreen(<InventoryScreen />);
    await waitFor(() => expect(screen.getByTestId('stock-name-i1')).toBeOnTheScreen());

    fireEvent.changeText(screen.getByTestId('inventory-search'), 'ric');
    expect(screen.getByTestId('stock-name-i2')).toBeOnTheScreen();
    expect(screen.queryByTestId('stock-name-i1')).not.toBeOnTheScreen();
  });

  it('adds a pantry item by hand, merging with an existing one of the same name', async () => {
    await seed({ inventory: [makeIngredient({ id: 'i1', name: 'Soy sauce', quantity: 1 })] });
    await renderScreen(<InventoryScreen />);
    await waitFor(() => expect(screen.getByTestId('new-inventory-item')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-inventory-item'));
    fireEvent.changeText(screen.getByTestId('inventory-name'), 'soy-sauce');
    fireEvent.changeText(screen.getByTestId('inventory-quantity'), '2');
    fireEvent.press(screen.getByTestId('inventory-save'));

    // Same item, typed differently: the amount is added, not duplicated.
    await waitFor(() => expect(screen.getByTestId('stock-qty-i1')).toHaveTextContent('3 L'));
    expect(screen.getAllByTestId(/^stock-row-/)).toHaveLength(1);

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).inventory).toHaveLength(1);
    });
  });

  it('deletes an item only after confirmation', async () => {
    await seed({ inventory: [makeIngredient({ id: 'i1' })] });
    await renderScreen(<InventoryScreen />);
    await waitFor(() => expect(screen.getByTestId('stock-name-i1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('stock-delete-i1'));
    expect(screen.getByText('Remove from the pantry?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() =>
      expect(screen.getByText(/Nothing in the pantry yet/)).toBeOnTheScreen()
    );
  });
});

describe('Inventory — shopping list', () => {
  it('suggests what ran out and what a meal needs, then adds on request', async () => {
    await seed({
      inventory: [makeIngredient({ id: 'i1', name: 'Soy sauce', quantity: 0 })],
      meals: [makeMeal()],
    });

    await renderScreen(<InventoryScreen />);
    await waitFor(() => expect(screen.getByTestId('inventory-tabs-shopping')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('inventory-tabs-shopping'));

    await waitFor(() => expect(screen.getByTestId('suggestion-name-soy sauce')).toBeOnTheScreen());
    expect(screen.getByTestId('suggestion-name-pork belly')).toBeOnTheScreen();
    expect(screen.getByText(/needed for Braised pork rice/)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('suggestion-add-soy sauce'));
    fireEvent.press(screen.getByTestId('suggestion-add-pork belly'));

    await waitFor(() => expect(screen.getAllByTestId(/^cart-row-/)).toHaveLength(2));
    expect(screen.getByTestId('inventory-tabs-shopping')).toHaveTextContent('Shopping list (2)');
    // Once queued, an item no longer shows among the suggestions.
    expect(screen.queryByTestId('suggestion-name-soy sauce')).not.toBeOnTheScreen();

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const shopping = JSON.parse(raw as string).shopping;
      expect(shopping).toHaveLength(2);
      expect(shopping[1]).toMatchObject({
        name: 'Pork belly',
        source: 'meal',
        sourceLabel: 'Braised pork rice',
      });
    });
  });

  it('adds a pantry item straight to the cart from its row', async () => {
    await seed({ inventory: [makeIngredient({ id: 'i1', name: 'Soy sauce', quantity: 1 })] });
    await renderScreen(<InventoryScreen />);
    await waitFor(() => expect(screen.getByTestId('stock-cart-i1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('stock-cart-i1'));

    await waitFor(() => expect(screen.getByTestId('inventory-tabs-shopping')).toHaveTextContent(/Shopping list \(1\)/));
    fireEvent.press(screen.getByTestId('inventory-tabs-shopping'));
    expect(screen.getByText('from the pantry')).toBeOnTheScreen();
  });

  it('ticks items off, keeps them until cleared, and removes on request', async () => {
    await seed({
      shopping: [
        makeShoppingItem({ id: 's1', name: 'Soy sauce', key: 'soy sauce' }),
        makeShoppingItem({ id: 's2', name: 'Rice', key: 'rice', source: 'manual' }),
      ],
    });

    await renderScreen(<InventoryScreen />);
    fireEvent.press(screen.getByTestId('inventory-tabs-shopping'));
    await waitFor(() => expect(screen.getByTestId('cart-name-s1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('cart-check-s1'));
    await waitFor(() => expect(screen.getByTestId('cart-check-s1')).toBeChecked());
    expect(screen.getByTestId('inventory-tabs-shopping')).toHaveTextContent('Shopping list (1)');

    fireEvent.press(screen.getByTestId('cart-remove-s2'));
    await waitFor(() => expect(screen.queryByTestId('cart-name-s2')).not.toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('shopping-clear'));
    await waitFor(() => expect(screen.queryByTestId('cart-name-s1')).not.toBeOnTheScreen());
    expect(screen.getByText('The list is empty — drop something here.')).toBeOnTheScreen();
  });
});

describe('Inventory — the stock level bar', () => {
  it('shows how much is left, and empties when the item runs out', async () => {
    await seed({
      inventory: [
        makeIngredient({ id: 'plenty', name: 'Soy sauce', key: 'soy sauce', quantity: 10, unit: 'L' }),
        makeIngredient({ id: 'some', name: 'Vinegar', key: 'vinegar', quantity: 0.5, unit: 'L' }),
        makeIngredient({
          id: 'none',
          name: 'Rice',
          key: 'rice',
          imageKey: 'rice',
          category: 'grocery',
          quantity: 0,
          unit: 'kg',
        }),
      ],
    });

    await renderScreen(<InventoryScreen />);

    await waitFor(() => expect(screen.getByTestId('stock-level-plenty')).toBeOnTheScreen());

    const width = (id: string) => Number(/([\d.]+)%/.exec(
      String(screen.getByTestId(`stock-level-${id}`).props.style.width)
    )?.[1]);

    expect(width('plenty')).toBe(100); // a lot in the pantry: a full bar
    expect(width('none')).toBe(0); // run out: an empty bar
    expect(width('some')).toBeGreaterThan(0);
    expect(width('some')).toBeLessThan(width('plenty'));
  });
});
