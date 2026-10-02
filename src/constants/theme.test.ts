import { Colors, Radius, Spacing } from '@/constants/theme';

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

  it('keeps every spacing step a plain, increasing number', () => {
    // React Native only accepts numbers for sizes — a CSS string here crashes
    // Android ("String cannot be cast to Double"), and a layout that scales
    // with the window leaves a cluster of content beside an empty void.
    const values = Object.values(Spacing);
    for (const value of values) {
      expect(typeof value).toBe('number');
    }
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('keeps every radius a plain number too', () => {
    for (const value of Object.values(Radius)) {
      expect(typeof value).toBe('number');
    }
  });
});
