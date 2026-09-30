import { Colors } from '@/constants/theme';
import { CATEGORY_META, CATEGORY_ORDER, categoryLabel } from '@/data/categories';

describe('categories', () => {
  it('keeps the three categories in the agreed order', () => {
    expect(CATEGORY_ORDER).toEqual(['condiment', 'grocery', 'misc']);
    expect(CATEGORY_ORDER.map(categoryLabel)).toEqual(['Condiment', 'Grocery', 'Miscellaneous']);
  });

  it('gives every category a colour present in both themes, distinct within each', () => {
    const light = CATEGORY_ORDER.map((id) => Colors.light[CATEGORY_META[id].colorKey]);
    const dark = CATEGORY_ORDER.map((id) => Colors.dark[CATEGORY_META[id].colorKey]);

    // All three look different from each other in either theme.
    expect(new Set(light).size).toBe(3);
    expect(new Set(dark).size).toBe(3);

    for (const color of [...light, ...dark]) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
