import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Phase 0 smoke test: proves the whole test pipeline works
// (jest-expo preset + babel + React Native + the `@/` alias + CSS stub).

describe('template smoke test', () => {
  it('renders themed text', () => {
    render(<ThemedText>Hello DlaiLog</ThemedText>);
    expect(screen.getByText('Hello DlaiLog')).toBeOnTheScreen();
  });

  it('renders a themed view with children', () => {
    render(
      <ThemedView testID="box">
        <ThemedText type="small">inside</ThemedText>
      </ThemedView>
    );
    expect(screen.getByTestId('box')).toBeOnTheScreen();
    expect(screen.getByText('inside')).toBeOnTheScreen();
  });
});
