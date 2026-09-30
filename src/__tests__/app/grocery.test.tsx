import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import GroceryScreen from '@/app/grocery';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type Purchase } from '@/store/types';

let mockPush: jest.Mock;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

async function seed(purchases: Purchase[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), purchases }));
}

beforeEach(async () => {
  mockPush = jest.fn();
  await AsyncStorage.clear();
});

describe('Grocery Tracker screen', () => {
  it('explains itself when there is nothing to track yet, and offers no add button', async () => {
    await renderScreen(<GroceryScreen />);

    await waitFor(() =>
      expect(
        screen.getByText('No items yet — log a purchase in Spending and it appears here automatically.')
      ).toBeOnTheScreen()
    );
    expect(screen.queryByText(/\+ Add/)).not.toBeOnTheScreen();
  });

  it('puts items in their category tabs and shows how many are in each', async () => {
    await seed([
      makePurchase({ id: 'soy' }),
      makePurchase({ id: 'rice', itemName: 'Rice', icon: '🍚', category: 'grocery', amount: 5, unit: 'kg', totalPrice: 10.5 }),
      makePurchase({ id: 'sponge', itemName: 'Sponges', icon: '🧽', category: 'misc', amount: 2, unit: 'pcs', totalPrice: 4.2, store: 'HomeShop' }),
    ]);

    await renderScreen(<GroceryScreen />);

    await waitFor(() => expect(screen.getByTestId('grocery-tab-condiment')).toBeOnTheScreen());
    expect(screen.getByTestId('grocery-tab-condiment')).toHaveTextContent('Condiment (1)');
    expect(screen.getByTestId('grocery-tab-grocery')).toHaveTextContent('Grocery (1)');
    expect(screen.getByTestId('grocery-tab-misc')).toHaveTextContent('Miscellaneous (1)');

    // Condiment is the tab we start on.
    expect(screen.getByTestId('grocery-name-soy sauce')).toBeOnTheScreen();
    expect(screen.queryByTestId('grocery-name-rice')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('grocery-tab-grocery'));
    expect(screen.getByTestId('grocery-name-rice')).toBeOnTheScreen();
    expect(screen.queryByTestId('grocery-name-soy sauce')).not.toBeOnTheScreen();
    expect(screen.getByTestId('grocery-price-rice')).toHaveTextContent('$2.10/kg');
  });

  it('shows the latest unit price and the change since the previous purchase', async () => {
    await seed([
      makePurchase({ id: 'jul', date: '2026-07-01', totalPrice: 5.0 }),
      makePurchase({ id: 'sep', date: '2026-09-28', totalPrice: 6.0, createdAt: '2026-09-28T10:00:00.000Z' }),
      makePurchase({
        id: 'rice-a',
        itemName: 'Rice',
        category: 'grocery',
        amount: 5,
        unit: 'kg',
        totalPrice: 10,
        date: '2026-08-01',
      }),
      makePurchase({
        id: 'rice-b',
        itemName: 'Rice',
        category: 'grocery',
        amount: 5,
        unit: 'kg',
        totalPrice: 9,
        date: '2026-09-28',
        createdAt: '2026-09-28T10:00:00.000Z',
      }),
      makePurchase({ id: 'sponge', itemName: 'Sponges', icon: '🧽', category: 'misc', totalPrice: 4.2, date: '2026-09-01', createdAt: '2026-09-01T10:00:00.000Z' }),
    ]);

    await renderScreen(<GroceryScreen />);
    await waitFor(() => expect(screen.getByTestId('grocery-price-soy sauce')).toBeOnTheScreen());

    expect(screen.getByTestId('grocery-price-soy sauce')).toHaveTextContent('$6.00/L');
    expect(screen.getByTestId('grocery-change-soy sauce')).toHaveTextContent('▲ +20%');

    fireEvent.press(screen.getByTestId('grocery-tab-grocery'));
    expect(screen.getByTestId('grocery-price-rice')).toHaveTextContent('$1.80/kg');
    expect(screen.getByTestId('grocery-change-rice')).toHaveTextContent('▼ -10%');

    fireEvent.press(screen.getByTestId('grocery-tab-misc'));
    expect(screen.getByTestId('grocery-change-sponges')).toHaveTextContent('— first purchase');
  });

  it('expands an item into a chart with one dot per purchase, statistics and history', async () => {
    await seed([
      makePurchase({ id: 'jul', date: '2026-07-01', totalPrice: 5.0, store: 'SuperMart' }),
      makePurchase({ id: 'aug', date: '2026-08-01', totalPrice: 5.5, createdAt: '2026-08-01T10:00:00.000Z' }),
      makePurchase({ id: 'sep', date: '2026-09-28', totalPrice: 6.45, createdAt: '2026-09-28T10:00:00.000Z' }),
    ]);

    await renderScreen(<GroceryScreen />);
    await waitFor(() => expect(screen.getByTestId('grocery-item-soy sauce')).toBeOnTheScreen());

    expect(screen.queryByTestId('grocery-details-soy sauce')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('grocery-item-soy sauce'));

    expect(screen.getByTestId('grocery-details-soy sauce')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-chart-soy sauce-dot-0')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-chart-soy sauce-dot-1')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-chart-soy sauce-dot-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('grocery-chart-soy sauce-dot-3')).not.toBeOnTheScreen();

    expect(screen.getByTestId('grocery-stats-soy sauce')).toHaveTextContent(
      'Low $5.00 · High $6.45 · Average $5.65 · Total spent $16.95  (per L)'
    );

    expect(screen.getByTestId('grocery-history-jul')).toBeOnTheScreen();
    expect(screen.getByTestId('grocery-history-sep')).toBeOnTheScreen();

    // Collapsing hides it again.
    fireEvent.press(screen.getByTestId('grocery-item-soy sauce'));
    expect(screen.queryByTestId('grocery-details-soy sauce')).not.toBeOnTheScreen();
  });

  it('sends you to the purchase in Spending from a history row', async () => {
    await seed([makePurchase({ id: 'sep', date: '2026-09-28' })]);

    await renderScreen(<GroceryScreen />);
    await waitFor(() => expect(screen.getByTestId('grocery-item-soy sauce')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('grocery-item-soy sauce'));
    fireEvent.press(screen.getByTestId('grocery-edit-sep'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/spending',
      params: { edit: 'sep' },
    });
  });

  it('searches item names', async () => {
    await seed([
      makePurchase({ id: 'soy' }),
      makePurchase({ id: 'oil', itemName: 'Olive oil', icon: '🫒', amount: 500, unit: 'ml', totalPrice: 6.45 }),
    ]);

    await renderScreen(<GroceryScreen />);
    await waitFor(() => expect(screen.getByTestId('grocery-name-soy sauce')).toBeOnTheScreen());

    fireEvent.changeText(screen.getByTestId('grocery-search'), 'olive');
    expect(screen.getByTestId('grocery-name-olive oil')).toBeOnTheScreen();
    expect(screen.queryByTestId('grocery-name-soy sauce')).not.toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('grocery-search'), 'zzz');
    expect(screen.getByText('No items match your search.')).toBeOnTheScreen();
  });
});
