import { renderHook } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

let mockScheme = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => mockScheme,
}));

describe('useTheme', () => {
  it('returns the light palette in light mode', () => {
    mockScheme = 'light';
    expect(renderHook(() => useTheme()).result.current).toEqual(Colors.light);
  });

  it('returns the dark palette when the system is dark — the app follows the OS', () => {
    mockScheme = 'dark';
    expect(renderHook(() => useTheme()).result.current).toEqual(Colors.dark);
  });

  it('falls back to light when the system does not say', () => {
    mockScheme = 'unspecified';
    expect(renderHook(() => useTheme()).result.current).toEqual(Colors.light);
  });
});
