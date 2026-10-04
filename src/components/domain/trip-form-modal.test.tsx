import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TripFormModal, type TripFormValues } from '@/components/domain/trip-form-modal';
import { INGREDIENT_PHOTOS } from '@/data/ingredient-photos';
import { todayKey } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import type { Purchase } from '@/store/types';

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'p1',
    date: '2026-09-28',
    itemName: 'Ketchup',
    imageKey: 'sauce-jar',
    category: 'condiment',
    amount: 1,
    unit: 'pcs',
    totalPrice: 3.99,
    store: 'Albertsons',
    createdAt: '2026-09-28T10:00:00.000Z',
    ...overrides,
  };
}

function renderTrip(onSubmit: (values: TripFormValues) => void, purchases: Purchase[] = []) {
  return render(
    <TripFormModal visible allPurchases={purchases} onClose={() => {}} onSubmit={onSubmit} />
  );
}

/** Fills one row: name, quantity, price and (optionally) savings. */
function fillRow(index: number, name: string, price: string, savings?: string) {
  fireEvent.changeText(screen.getByTestId(`trip-item-name-${index}`), name);
  fireEvent.changeText(screen.getByTestId(`trip-item-price-${index}`), price);
  if (savings !== undefined) {
    fireEvent.changeText(screen.getByTestId(`trip-item-savings-${index}`), savings);
  }
}

describe('TripFormModal — logging a whole shopping trip', () => {
  it('opens with three rows and adds another on request', () => {
    renderTrip(jest.fn());

    expect(screen.getByTestId('trip-item-0')).toBeOnTheScreen();
    expect(screen.getByTestId('trip-item-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-item-3')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('trip-add-item'));

    expect(screen.getByTestId('trip-item-3')).toBeOnTheScreen();
  });

  it('removes a row when its ✕ is pressed', () => {
    renderTrip(jest.fn());

    fireEvent.press(screen.getByTestId('trip-item-remove-1'));

    expect(screen.queryByTestId('trip-item-2')).not.toBeOnTheScreen();
    expect(screen.getByTestId('trip-item-1')).toBeOnTheScreen();
  });

  it('adds the trip up as it is typed: gross, savings and what was really paid', () => {
    renderTrip(jest.fn());

    fillRow(0, 'Coffee', '10.99');
    fillRow(1, 'Steak', '16.59', '4.59');

    expect(screen.getByTestId('trip-summary-gross')).toHaveTextContent(
      new RegExp(escapeForRegExp(formatMoney(32.17)))
    );
    expect(screen.getByTestId('trip-summary-paid')).toHaveTextContent(formatMoney(27.58));
    expect(screen.getByTestId('trip-summary-savings')).toHaveTextContent('−' + formatMoney(4.59));
    expect(screen.getByTestId('trip-save')).toHaveTextContent('Save trip (2 items)');
  });

  it('saves every filled row in one batch, ignoring blank ones', () => {
    const onSubmit = jest.fn();
    renderTrip(onSubmit);

    fireEvent.changeText(screen.getByTestId('trip-store'), 'Albertsons');
    fillRow(0, 'Coffee', '10.99');
    fireEvent.changeText(screen.getByTestId('trip-item-qty-0'), '12');
    fireEvent.press(screen.getByTestId('trip-item-unit-0'));
    fireEvent.press(screen.getByTestId('trip-item-unit-0-option-oz'));
    fireEvent.press(screen.getByTestId('trip-item-category-0'));
    fireEvent.press(screen.getByTestId('trip-item-category-0-option-misc'));
    fillRow(1, 'Steak', '16.59', '4.59');

    fireEvent.press(screen.getByTestId('trip-save'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0] as TripFormValues;
    expect(values.store).toBe('Albertsons');
    expect(values.date).toBe(todayKey());
    expect(values.items).toHaveLength(2);
    expect(values.items[0]).toMatchObject({
      itemName: 'Coffee',
      category: 'misc',
      amount: 12,
      unit: 'oz',
      totalPrice: 10.99,
    });
    expect(values.items[0].savings).toBeUndefined();
    expect(values.items[1]).toMatchObject({ itemName: 'Steak', totalPrice: 16.59, savings: 4.59 });
  });

  it('picks the picture from the item name, so the row is never blank', () => {
    renderTrip(jest.fn());

    fireEvent.changeText(screen.getByTestId('trip-item-name-0'), 'Rice');

    const picture = screen.getByTestId('trip-item-0').findByProps({ source: INGREDIENT_PHOTOS.rice });
    expect(picture).toBeTruthy();
  });

  it('fills in what it already knows when a past item is picked', () => {
    renderTrip(jest.fn(), [makePurchase()]);

    fireEvent.changeText(screen.getByTestId('trip-item-name-0'), 'Ketch');
    fireEvent.press(screen.getByTestId('trip-item-name-0-suggestion-0'));

    expect(screen.getByTestId('trip-item-price-0').props.value).toBe('3.99');
    expect(screen.getByTestId('trip-store').props.value).toBe('Albertsons');
    // The dropdown shows the label plus its ▾ marker, so match loosely.
    expect(screen.getByTestId('trip-item-category-0')).toHaveTextContent(/Condiment/);
  });

  it('will not save without a store, an item, or a price', async () => {
    const onSubmit = jest.fn();
    renderTrip(onSubmit);

    // Nothing filled in at all.
    fireEvent.press(screen.getByTestId('trip-save'));

    await waitFor(() => expect(screen.getByTestId('trip-form-error')).toBeOnTheScreen());
    expect(onSubmit).not.toHaveBeenCalled();

    // A named item with no price is refused too.
    fireEvent.changeText(screen.getByTestId('trip-store'), 'Albertsons');
    fireEvent.changeText(screen.getByTestId('trip-item-name-0'), 'Coffee');
    fireEvent.press(screen.getByTestId('trip-save'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter what you paid')).toBeOnTheScreen();
  });
});

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
