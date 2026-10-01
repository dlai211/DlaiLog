import type { Unit } from '@/store/types';

export const UNIT_OPTIONS: Unit[] = ['ml', 'L', 'g', 'kg', 'pcs', 'pack'];

export const UNIT_LABELS: Record<Unit, string> = {
  ml: 'ml',
  L: 'L',
  g: 'g',
  kg: 'kg',
  pcs: 'pcs',
  pack: 'pack',
};
