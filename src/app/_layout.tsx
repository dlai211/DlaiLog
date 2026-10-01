// Global web styles (font variables) are loaded once, at the app entry point.
import '@/global.css';

import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

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
          {/*
            The shell is rendered only once the saved data has loaded — which
            only happens after the page has hydrated in the browser.

            This matters for static rendering: the pre-rendered HTML has no
            window, so a responsive shell (sidebar vs bottom bar) would render
            the narrow layout on the server and the wide one on the client,
            and React would report a hydration mismatch. Gating everything
            behind the load avoids that whole class of bug.
          */}
          <ReadyGate>
            <AppShell>
              <Slot />
            </AppShell>
          </ReadyGate>
        </DataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function ReadyGate({ children }: { children: ReactNode }) {
  const { ready } = useData();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ThemedText type="small" themeColor="textSecondary">
          Loading your data…
        </ThemedText>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
