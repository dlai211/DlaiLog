import { Colors, Spacing } from '@/constants/theme';
import { fluidText } from '@/lib/fluid';

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

  it('scales every spacing step with the window, and keeps the scale increasing', () => {
    // The tokens are CSS clamps at runtime (see lib/fluid); the middle value —
    // the share of the window width — is the step's true size.
    const DESIGN_WIDTH = 1440;
    const preferred = Object.values(Spacing).map((value) => {
      const text = fluidText(value);
      const match = /^clamp\(([\d.]+)px, ([\d.]+)vw, ([\d.]+)px\)$/.exec(text);
      expect(match).not.toBeNull();
      const [min, middle, max] = match!.slice(1).map(Number);
      const middlePx = (middle / 100) * DESIGN_WIDTH;
      expect(min).toBeLessThan(middlePx);
      expect(middlePx).toBeLessThan(max);
      return middlePx;
    });

    for (let i = 1; i < preferred.length; i += 1) {
      expect(preferred[i]).toBeGreaterThan(preferred[i - 1]);
    }
  });
});
