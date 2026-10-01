import type { ThemeColor } from '@/constants/theme';
import type { Category } from '@/store/types';

export interface CategoryMeta {
  label: string;
  emoji: string;
  /** Theme palette key — Condiment amber, Grocery green, Miscellaneous blue (PRD §2.3). */
  colorKey: ThemeColor;
}

export const CATEGORY_ORDER: Category[] = ['condiment', 'grocery', 'misc'];

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  condiment: { label: 'Condiment', emoji: '🧂', colorKey: 'condiment' },
  grocery: { label: 'Grocery', emoji: '🥦', colorKey: 'grocery' },
  misc: { label: 'Miscellaneous', emoji: '🧴', colorKey: 'misc' },
};

export function categoryLabel(category: Category): string {
  return CATEGORY_META[category].label;
}
