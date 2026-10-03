import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  THEME_PREFERENCE_KEY,
  ThemePreferenceProvider,
  useThemePreference,
} from '@/hooks/use-theme-preference';

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

describe('the System / Light / Dark choice', () => {
  function Probe() {
    const { preference, scheme, setPreference } = useThemePreference();
    const theme = useTheme();

    return (
      <>
        <Text testID="preference">{preference}</Text>
        <Text testID="scheme">{scheme}</Text>
        <Text testID="background">{theme.background}</Text>
        <Pressable testID="choose-dark" onPress={() => setPreference('dark')} />
        <Pressable testID="choose-light" onPress={() => setPreference('light')} />
      </>
    );
  }

  async function renderProbe() {
    const view = render(
      <ThemePreferenceProvider>
        <Probe />
      </ThemePreferenceProvider>
    );
    // The saved choice is read asynchronously after mount.
    await act(async () => {});
    return view;
  }

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockScheme = 'light';
  });

  it('follows the system until a choice is made', async () => {
    mockScheme = 'dark';
    await renderProbe();

    expect(screen.getByTestId('preference')).toHaveTextContent('system');
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent(Colors.dark.background);
  });

  it('pins dark even when the system is light, and remembers the choice', async () => {
    mockScheme = 'light';
    await renderProbe();

    fireEvent.press(screen.getByTestId('choose-dark'));

    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent(Colors.dark.background);
    expect(await AsyncStorage.getItem(THEME_PREFERENCE_KEY)).toBe('dark');
  });

  it('pins light even when the system is dark', async () => {
    mockScheme = 'dark';
    await renderProbe();

    fireEvent.press(screen.getByTestId('choose-light'));

    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
    expect(screen.getByTestId('background')).toHaveTextContent(Colors.light.background);
  });

  it('loads a saved choice on the next visit', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'dark');
    mockScheme = 'light';

    await renderProbe();

    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
  });

  it('ignores a stored value that is not a real preference', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'neon');
    mockScheme = 'light';

    await renderProbe();

    expect(screen.getByTestId('preference')).toHaveTextContent('system');
  });
});
