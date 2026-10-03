import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import GroceryScreen from '@/app/grocery';
import HomeScreen from '@/app/index';
import ProjectsScreen from '@/app/projects';
import SpendingScreen from '@/app/spending';
import TodoScreen from '@/app/todo';
import { currentMonthKey, todayKey } from '@/lib/dates';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type DB, type Purchase, type Task } from '@/store/types';

/**
 * Cross-module acceptance flows from PRD §10: two screens mounted side by
 * side on one shared database, proving the modules really are one live system.
 */

let mockParams: Record<string, string> = {};
let mockPush: jest.Mock;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

const today = todayKey();
const thisMonth = currentMonthKey();

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pu1',
    date: `${thisMonth}-05`,
    itemName: 'Soy sauce',
    icon: '🍜',
    category: 'condiment',
    amount: 1,
    unit: 'L',
    totalPrice: 6.45,
    store: 'Asia Market',
    createdAt: `${thisMonth}-05T10:00:00.000Z`,
    ...overrides,
  };
}

async function seed(partial: Partial<DB>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), ...partial }));
}

beforeEach(async () => {
  mockParams = { date: today };
  mockPush = jest.fn();
  await AsyncStorage.clear();
});

describe('Spending feeds the Grocery Tracker', () => {
  it('shows a purchase in the tracker as soon as it is logged', async () => {
    await renderScreen(
      <>
        <SpendingScreen />
        <GroceryScreen />
      </>
    );
    await waitFor(() => expect(screen.getByText('No purchases yet — log your first one.')).toBeOnTheScreen());

    // Log a condiment from scratch, the way a person would.
    fireEvent.press(screen.getByTestId('new-purchase'));
    fireEvent.changeText(screen.getByTestId('purchase-name'), 'Soy sauce');
    fireEvent.changeText(screen.getByTestId('purchase-picture-search'), 'soy');
    fireEvent.press(screen.getByTestId('purchase-picture-option-soy-sauce'));
    fireEvent.press(screen.getByTestId('purchase-category-condiment'));
    fireEvent.changeText(screen.getByTestId('purchase-amount'), '1');
    fireEvent.press(screen.getByTestId('purchase-unit'));
    fireEvent.press(screen.getByTestId('purchase-unit-option-L'));
    fireEvent.changeText(screen.getByTestId('purchase-total'), '6.45');
    fireEvent.changeText(screen.getByTestId('purchase-store'), 'Asia Market');
    fireEvent.press(screen.getByTestId('purchase-save'));

    // It is in the Spending list (store · amount · unit price — unique to that row)…
    await waitFor(() =>
      expect(screen.getByText(/Asia Market · 1 L · \$6\.45\/L/)).toBeOnTheScreen()
    );

    // …and, with no further action, in the Grocery Tracker's Condiment tab.
    expect(screen.getByTestId('grocery-tab-condiment')).toHaveTextContent('Condiment (1)');
    expect(screen.getByTestId('grocery-name-soy sauce')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-price-soy sauce')).toHaveTextContent('$6.45/L');
  });

  it('merges an entry into the corrected item when its name is fixed', async () => {
    await seed({
      purchases: [
        makePurchase({ id: 'a', date: `${thisMonth}-01`, itemName: 'Soy sauce', totalPrice: 6 }),
        makePurchase({
          id: 'b',
          date: `${thisMonth}-15`,
          itemName: 'Rice',
          icon: '🍚',
          category: 'grocery',
          totalPrice: 5,
          createdAt: `${thisMonth}-15T10:00:00.000Z`,
        }),
      ],
    });

    await renderScreen(
      <>
        <SpendingScreen />
        <GroceryScreen />
      </>
    );
    await waitFor(() => expect(screen.getByTestId('purchase-row-b')).toBeOnTheScreen());

    // Before: two separate items.
    expect(screen.getByTestId('grocery-tab-condiment')).toHaveTextContent('Condiment (1)');
    expect(screen.getByTestId('grocery-tab-grocery')).toHaveTextContent('Grocery (1)');

    // Fix the name so both purchases are the same item.
    fireEvent.press(screen.getByTestId('purchase-open-b'));
    fireEvent.changeText(screen.getByTestId('purchase-name'), 'Soy sauce');
    fireEvent.press(screen.getByTestId('purchase-save'));

    // After: one item, two purchases of history, and a price change to show for it.
    await waitFor(() =>
      expect(screen.getByTestId('grocery-tab-condiment')).toHaveTextContent('Condiment (0)')
    );
    expect(screen.getByTestId('grocery-tab-grocery')).toHaveTextContent('Grocery (1)');
    fireEvent.press(screen.getByTestId('grocery-tab-grocery'));

    expect(screen.getByTestId('grocery-name-soy sauce')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-change-soy sauce')).toHaveTextContent('▼ -17%');

    fireEvent.press(screen.getByTestId('grocery-item-soy sauce'));
    expect(screen.getByTestId('grocery-history-a')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-history-b')).toBeOnTheScreen();
  });
});

describe('Home reflects the other modules live', () => {
  it('shows a project progress change made in Projects straight away', async () => {
    await seed({
      projects: [
        {
          id: 'p1',
          name: 'DlaiLog website',
          status: 'in-progress',
          progress: 40,
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-01T08:00:00.000Z',
        },
      ],
    });

    await renderScreen(
      <>
        <ProjectsScreen />
        <HomeScreen />
      </>
    );
    await waitFor(() => expect(screen.getAllByText('DlaiLog website').length).toBe(2));

    // Change the progress on the Projects screen…
    fireEvent.press(screen.getByTestId('project-card-p1'));
    fireEvent.press(screen.getByTestId('project-progress-increase'));
    fireEvent.press(screen.getByTestId('project-save'));

    // …and Home's bar has moved with it.
    await waitFor(() =>
      expect(screen.getByTestId('home-project-bar-p1').props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 45,
      })
    );
  });
});

describe("Home and To-do are the same tasks", () => {
  it('ticking on Home shows as done in the To-do Day view', async () => {
    const task: Task = {
      id: 'paint',
      title: 'Buy paint',
      date: today,
      done: false,
      createdAt: `${today}T08:00:00.000Z`,
    };
    await seed({ tasks: [task] });

    await renderScreen(
      <>
        <HomeScreen />
        <TodoScreen />
      </>
    );

    await waitFor(() => expect(screen.getAllByText('Buy paint').length).toBe(2));

    // Tick it off on the Home side (the first screen in the tree).
    fireEvent.press(screen.getAllByTestId('task-check-paint')[0]);

    // Home says "Done today (1)" and To-do's own Done section says "Done (1)".
    await waitFor(() => expect(screen.getByText('Done today (1)')).toBeOnTheScreen());
    expect(screen.getByText('Done (1)')).toBeOnTheScreen();
  });
});
