import { Colors, Spacing } from '@/constants/theme';

describe('theme constants', () => {
  it('defines a complete light and dark palette', () => {
    const required = ['text', 'background', 'backgroundElement', 'backgroundSelected', 'textSecondary'];
    for (const key of required) {
      expect(Colors.light).toHaveProperty(key);
      expect(Colors.dark).toHaveProperty(key);
    }
  });

  it('has the same color keys in light and dark mode', () => {
    expect(Object.keys(Colors.light).sort()).toEqual(Object.keys(Colors.dark).sort());
  });

  it('keeps the spacing scale strictly increasing', () => {
    const values = Object.values(Spacing);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
