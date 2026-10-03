import type { ThemeColor } from '@/constants/theme';
import type { Category } from '@/store/types';

export interface CategoryMeta {
  label: string;
  /** Theme palette key — Condiment amber, Grocery green, Miscellaneous blue (PRD §2.3). */
  colorKey: ThemeColor;
}

export const CATEGORY_ORDER: Category[] = ['condiment', 'grocery', 'misc'];

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  condiment: { label: 'Condiment', colorKey: 'condiment' },
  grocery: { label: 'Grocery', colorKey: 'grocery' },
  misc: { label: 'Miscellaneous', colorKey: 'misc' },
};

export function categoryLabel(category: Category): string {
  return CATEGORY_META[category].label;
}
