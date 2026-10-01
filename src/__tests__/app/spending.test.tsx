import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import SpendingScreen from '@/app/spending';
import { currentMonthKey, shiftMonthKey } from '@/lib/dates';
import { formatLongDate, formatMonthKey } from '@/lib/format';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type Purchase } from '@/store/types';

let mockParams: Record<string, string> = {};
let mockReplace: jest.Mock;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}));

const thisMonth = currentMonthKey();
const thisMonth10 = `${thisMonth}-10`;
const thisMonth20 = `${thisMonth}-20`;

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pu1',
    date: thisMonth10,
    itemName: 'Soy sauce',
    icon: '🍜',
    category: 'condiment',
    amount: 1,
    unit: 'L',
    totalPrice: 6.45,
    store: 'Asia Market',
    createdAt: `${thisMonth10}T10:00:00.000Z`,
    ...overrides,
  };
}

async function seed(purchases: Purchase[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), purchases }));
}

beforeEach(async () => {
  mockParams = {};
  mockReplace = jest.fn();
  await AsyncStorage.clear();
});

describe('Spending screen', () => {
  it('shows a friendly empty state before anything is logged', async () => {
    await renderScreen(<SpendingScreen />);
    await waitFor(() =>
      expect(screen.getByText('No purchases yet — log your first one.')).toBeOnTheScreen()
    );
  });

  it('groups purchases by day, newest day first, with unit prices and totals', async () => {
    await seed([
      makePurchase({ id: 'p1' }),
      makePurchase({
        id: 'p2',
        itemName: 'Rice',
        icon: '🍚',
        category: 'grocery',
        amount: 5,
        unit: 'kg',
        totalPrice: 10.5,
        store: 'SuperMart',
        createdAt: `${thisMonth10}T18:00:00.000Z`,
      }),
      makePurchase({
        id: 'p3',
        date: thisMonth20,
        itemName: 'Sponges',
        icon: '🧽',
        category: 'misc',
        amount: 2,
        unit: 'pcs',
        totalPrice: 4.2,
        store: 'HomeShop',
        createdAt: `${thisMonth20}T09:00:00.000Z`,
      }),
    ]);

    await renderScreen(<SpendingScreen />);
    await waitFor(() => expect(screen.getByText('Soy sauce')).toBeOnTheScreen());

    const days = screen.getAllByTestId(/^spending-day-\d{4}/);
    expect(days[0].props.testID).toBe(`spending-day-${thisMonth20}`);
    expect(days[1].props.testID).toBe(`spending-day-${thisMonth10}`);

    expect(screen.getByTestId(`spending-day-total-${thisMonth10}`)).toHaveTextContent('day total $16.95');
    expect(screen.getByTestId(`spending-day-total-${thisMonth20}`)).toHaveTextContent('day total $4.20');
    expect(screen.getByText(formatLongDate(thisMonth10))).toBeOnTheScreen();

    // Unit price and amount are shown next to the item.
    expect(screen.getByText(/Asia Market · 1 L · \$6\.45\/L/)).toBeOnTheScreen();
    expect(screen.getByText(/SuperMart · 5 kg · \$2\.10\/kg/)).toBeOnTheScreen();

    // The month summary strip.
    expect(screen.getByTestId('spending-summary')).toHaveTextContent(
      `${formatMonthKey(thisMonth)}: $21.15 · 3 entries · Top store: SuperMart`
    );
  });

  it('fills in everything it remembers when a past item is picked, and previews the unit price', async () => {
    await seed([makePurchase({ id: 'p1' })]);

    await renderScreen(<SpendingScreen />);
    await waitFor(() => expect(screen.getByText('Soy sauce')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-purchase'));
    fireEvent.changeText(screen.getByTestId('purchase-name'), 'soy');

    // The suggestion appears; picking it fills the whole form.
    await waitFor(() =>
      expect(screen.getByTestId('purchase-name-suggestion-0')).toBeOnTheScreen()
    );
    fireEvent.press(screen.getByTestId('purchase-name-suggestion-0'));

    expect(screen.getByTestId('purchase-name').props.value).toBe('Soy sauce');
    expect(screen.getByTestId('purchase-store').props.value).toBe('Asia Market');
    expect(screen.getByTestId('purchase-category-condiment')).toBeSelected();
    expect(screen.getByTestId('purchase-unit')).toHaveTextContent(/^L/);

    // Live preview while typing amount + total.
    fireEvent.changeText(screen.getByTestId('purchase-amount'), '2');
    fireEvent.changeText(screen.getByTestId('purchase-total'), '9');
    expect(screen.getByTestId('unit-price-preview')).toHaveTextContent('= $4.50 per L');

    fireEvent.press(screen.getByTestId('purchase-save'));

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = JSON.parse(raw as string).purchases;
      expect(saved).toHaveLength(2);
      expect(saved[1]).toMatchObject({
        itemName: 'Soy sauce',
        // The picture is remembered from the item's history (guessed from its
        // name for version-1 rows, which only carried an emoji).
        imageKey: 'soy-sauce',
        category: 'condiment',
        amount: 2,
        unit: 'L',
        totalPrice: 9,
        store: 'Asia Market',
      });
    });
  });

  it('refuses to save an incomplete purchase', async () => {
    await renderScreen(<SpendingScreen />);
    await waitFor(() => expect(screen.getByTestId('new-purchase')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-purchase'));
    fireEvent.press(screen.getByTestId('purchase-save'));

    expect(screen.getByText('Item name is required')).toBeOnTheScreen();
    expect(screen.getByText('Pick a picture')).toBeOnTheScreen();
    expect(screen.getByText('Enter an amount above 0')).toBeOnTheScreen();
    expect(screen.getByText('Enter a price above 0')).toBeOnTheScreen();
    expect(screen.getByText('Store is required')).toBeOnTheScreen();
    expect(screen.getByTestId('purchase-form')).toBeOnTheScreen();
  });

  it('filters by category, store, search and month', async () => {
    await seed([
      makePurchase({ id: 'p1', itemName: 'Soy sauce' }),
      makePurchase({ id: 'p2', itemName: 'Rice', category: 'grocery', store: 'SuperMart' }),
      makePurchase({
        id: 'p3',
        itemName: 'Sponges',
        category: 'misc',
        store: 'HomeShop',
        date: `${shiftMonthKey(thisMonth, -1)}-15`,
        createdAt: `${shiftMonthKey(thisMonth, -1)}-15T09:00:00.000Z`,
      }),
    ]);

    await renderScreen(<SpendingScreen />);
    await waitFor(() => expect(screen.getByText('Soy sauce')).toBeOnTheScreen());

    // Category filter.
    fireEvent.press(screen.getByTestId('spending-category-grocery'));
    expect(screen.getByText('Rice')).toBeOnTheScreen();
    expect(screen.queryByText('Soy sauce')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('spending-category-all'));

    // Search filter.
    fireEvent.changeText(screen.getByTestId('spending-search'), 'spon');
    expect(screen.getByText('No purchases match your filters.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('spending-search'), '');

    // Store filter.
    fireEvent.press(screen.getByTestId('spending-store'));
    fireEvent.press(screen.getByTestId('spending-store-option-SuperMart'));
    expect(screen.getByText('Rice')).toBeOnTheScreen();
    expect(screen.queryByText('Soy sauce')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('spending-store'));
    fireEvent.press(screen.getByTestId('spending-store-option-all'));

    // Month navigation reaches last month's purchase.
    expect(screen.queryByText('Sponges')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('spending-prev-month'));
    expect(screen.getByTestId('spending-month')).toHaveTextContent(
      formatMonthKey(shiftMonthKey(thisMonth, -1))
    );
    expect(screen.getByText('Sponges')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('spending-this-month'));
    expect(screen.getByTestId('spending-month')).toHaveTextContent(formatMonthKey(thisMonth));
  });

  it('edits a purchase from the row', async () => {
    await seed([makePurchase({ id: 'p1', totalPrice: 6.45 })]);
    await renderScreen(<SpendingScreen />);
    await waitFor(() => expect(screen.getByText('Soy sauce')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('purchase-open-p1'));
    expect(screen.getByTestId('purchase-total').props.value).toBe('6.45');

    fireEvent.changeText(screen.getByTestId('purchase-total'), '7.2');
    fireEvent.press(screen.getByTestId('purchase-save'));

    await waitFor(() => expect(screen.getByText('$7.20')).toBeOnTheScreen());
  });

  it('opens the editor straight away when arriving with ?edit=<id>', async () => {
    await seed([makePurchase({ id: 'p1', itemName: 'Soy sauce' })]);
    mockParams = { edit: 'p1' };

    await renderScreen(<SpendingScreen />);

    await waitFor(() => expect(screen.getByTestId('purchase-form')).toBeOnTheScreen());
    expect(screen.getByTestId('purchase-name').props.value).toBe('Soy sauce');

    fireEvent.changeText(screen.getByTestId('purchase-store'), 'SuperMart');
    fireEvent.press(screen.getByTestId('purchase-save'));

    // Saving cleans the ?edit=… parameter out of the URL.
    expect(mockReplace).toHaveBeenCalledWith('/spending');
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).purchases[0].store).toBe('SuperMart');
    });
  });

  it('deletes a purchase only after confirmation, and updates the tracker data', async () => {
    await seed([makePurchase({ id: 'p1', itemName: 'Soy sauce' })]);
    await renderScreen(<SpendingScreen />);
    await waitFor(() => expect(screen.getByText('Soy sauce')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('purchase-delete-p1'));
    expect(screen.getByText('Delete this purchase?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    expect(screen.getByText('Soy sauce')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('purchase-delete-p1'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(screen.queryByText('Soy sauce')).not.toBeOnTheScreen());
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).purchases).toHaveLength(0);
    });
  });
});
