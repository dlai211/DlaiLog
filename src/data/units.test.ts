import { UNIT_LABELS, UNIT_OPTIONS, quantityStep } from '@/data/units';
import type { Unit } from '@/store/types';

describe('the unit list', () => {
  it('covers every unit the app can store', () => {
    // Every unit a record may hold must be offered in the dropdowns, or the
    // form would silently rewrite it to something else.
    const all: Unit[] = [
      'qty',
      'pcs',
      'pack',
      'bag',
      'g',
      'kg',
      'lb',
      'oz',
      'ml',
      'L',
      'tbsp',
      'tsp',
      'clove',
      'stalk',
    ];
    expect([...UNIT_OPTIONS].sort()).toEqual([...all].sort());
    for (const unit of all) {
      expect(UNIT_LABELS[unit]).toBeTruthy();
    }
  });

  it('includes the cooking measures and the catch-all', () => {
    for (const unit of ['tbsp', 'tsp', 'clove', 'stalk', 'qty'] as Unit[]) {
      expect(UNIT_OPTIONS).toContain(unit);
    }
    expect(UNIT_LABELS.qty).toBe('Qty');
  });

  it('steps by a sensible amount for each kind of unit', () => {
    expect(quantityStep('kg')).toBe(0.5);
    expect(quantityStep('lb')).toBe(0.25);
    expect(quantityStep('g')).toBe(50);
    expect(quantityStep('tbsp')).toBe(1);
    expect(quantityStep('clove')).toBe(1);
    expect(quantityStep('qty')).toBe(1);
  });
});
