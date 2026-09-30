import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppShell, isNavItemActive, isWideLayout, NAV_ITEMS } from '@/components/app-shell';

// Configurable stand-ins for the router and the window size. Names start with
// "mock" so jest's hoisted mock factories may reference them.
let mockPush: jest.Mock;
let mockPathname: string;
let mockWindowWidth: number;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('@/hooks/use-window-width', () => ({
  useWindowWidth: () => mockWindowWidth,
}));

beforeEach(() => {
  mockPush = jest.fn();
  mockPathname = '/';
  mockWindowWidth = 750; // narrow by default
});

describe('isWideLayout', () => {
  it('uses the sidebar from 1000px upwards', () => {
    expect(isWideLayout(999)).toBe(false);
    expect(isWideLayout(1000)).toBe(true);
    expect(isWideLayout(1600)).toBe(true);
  });
});

describe('isNavItemActive', () => {
  it('marks Home active only on the root path', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/todo', '/')).toBe(false);
  });

  it('marks a section active on its path and on sub-paths', () => {
    expect(isNavItemActive('/todo', '/todo')).toBe(true);
    expect(isNavItemActive('/todo/something', '/todo')).toBe(true);
    expect(isNavItemActive('/spending', '/todo')).toBe(false);
  });
});

describe('AppShell', () => {
  it('shows the bottom bar on narrow windows, with all five sections', () => {
    render(<AppShell>{null}</AppShell>);

    expect(screen.getByTestId('app-shell-bottom-bar')).toBeOnTheScreen();
    expect(screen.queryByTestId('app-shell-sidebar')).not.toBeOnTheScreen();
    for (const item of NAV_ITEMS) {
      expect(screen.getByTestId(`nav-${item.id}`)).toBeOnTheScreen();
    }
  });

  it('shows the sidebar on wide windows instead of the bottom bar', () => {
    mockWindowWidth = 1200;
    render(<AppShell>{null}</AppShell>);

    expect(screen.getByTestId('app-shell-sidebar')).toBeOnTheScreen();
    expect(screen.queryByTestId('app-shell-bottom-bar')).not.toBeOnTheScreen();
  });

  it('renders the current screen inside the content area', () => {
    render(
      <AppShell>
        <Text>Screen content</Text>
      </AppShell>
    );

    expect(screen.getByText('Screen content')).toBeOnTheScreen();
  });

  it('navigates when a navigation item is pressed', () => {
    render(<AppShell>{null}</AppShell>);

    fireEvent.press(screen.getByTestId('nav-todo'));
    expect(mockPush).toHaveBeenCalledWith('/todo');

    fireEvent.press(screen.getByTestId('nav-grocery'));
    expect(mockPush).toHaveBeenCalledWith('/grocery');
  });

  it('highlights the active section', () => {
    mockPathname = '/spending';
    render(<AppShell>{null}</AppShell>);

    expect(screen.getByTestId('nav-spending')).toBeSelected();
    expect(screen.getByTestId('nav-home')).not.toBeSelected();
  });

  it('offers Backup / Restore in the sidebar even before data exists (disabled until Phase 8)', () => {
    mockWindowWidth = 1200;
    render(<AppShell>{null}</AppShell>);

    const backup = screen.getByTestId('backup-button');
    expect(backup).toBeOnTheScreen();
    expect(backup).toBeDisabled();
    expect(screen.getByText('Saved on this PC')).toBeOnTheScreen();
  });
});
