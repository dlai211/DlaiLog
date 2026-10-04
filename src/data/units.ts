import type { Unit } from '@/store/types';

export const UNIT_OPTIONS: Unit[] = ['ml', 'L', 'g', 'kg', 'pcs', 'pack', 'bag', 'lb', 'oz'];

export const UNIT_LABELS: Record<Unit, string> = {
  ml: 'ml',
  L: 'L',
  g: 'g',
  kg: 'kg',
  pcs: 'pcs',
  pack: 'pack',
  bag: 'bag',
  lb: 'lb',
  oz: 'oz',
};

/**
 * A sensible step for the pantry's "+" and "−" buttons: whole pieces for
 * countable things, halves for litres and kilos, quarters for pounds, and
 * fifties for grams and millilitres.
 */
export function quantityStep(unit: Unit): number {
  switch (unit) {
    case 'kg':
    case 'L':
      return 0.5;
    case 'lb':
      return 0.25;
    case 'g':
    case 'ml':
      return 50;
    default:
      return 1;
  }
}
