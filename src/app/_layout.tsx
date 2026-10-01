// Global web styles (font variables) are loaded once, at the app entry point.
import '@/global.css';

import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppShell } from '@/components/app-shell';
import { ThemedText } from '@/components/themed-text';
import { ToastProvider } from '@/components/ui/toast';
import { DataProvider, useData } from '@/store/data-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <DataProvider>
          <AnimatedSplashOverlay />
          <AppShell>
            <ReadyGate>
              <Slot />
            </ReadyGate>
          </AppShell>
        </DataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

/** Screens render only once the saved data has been loaded (PRD §7.1). */
function ReadyGate({ children }: { children: ReactNode }) {
  const { ready } = useData();

  if (!ready) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Loading your data…
      </ThemedText>
    );
  }

  return <>{children}</>;
}
