import { act, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { DataProvider } from '@/store/data-provider';

/**
 * Renders a screen inside the app's real providers, and waits for the data
 * provider's asynchronous load inside `act()` so React never warns about
 * updates outside act.
 */
export async function renderScreen(ui: ReactElement) {
  const view = render(
    <ToastProvider>
      <DataProvider>{ui}</DataProvider>
    </ToastProvider>
  );

  // Let the data provider's asynchronous load finish inside act() before the
  // test body starts.
  await act(async () => {});

  return view;
}
