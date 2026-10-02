import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppShell, isNavItemActive, isWideLayout, NAV_ITEMS } from '@/components/app-shell';
import { SIDEBAR_STORAGE_KEY } from '@/hooks/use-sidebar-collapsed';
import { renderScreen } from '@/test/helpers';

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

  it('offers Backup / Restore in the sidebar, which opens the backup dialog', async () => {
    mockWindowWidth = 1200;
    await renderScreen(<AppShell>{null}</AppShell>);

    const backup = screen.getByTestId('backup-button');
    expect(backup).toBeOnTheScreen();
    expect(backup).not.toBeDisabled();
    expect(screen.getByText('Saved on this PC')).toBeOnTheScreen();

    expect(screen.queryByTestId('backup-modal')).not.toBeOnTheScreen();
    fireEvent.press(backup);
    expect(screen.getByTestId('backup-modal')).toBeOnTheScreen();
    expect(screen.getByTestId('backup-download')).toBeOnTheScreen();
  });
});

describe('the sidebar’s order and its compact mode', () => {
  it('lists the sections top to bottom as Home, To-do, Projects, Meals, Inventory, Spending, Grocery', () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      'home',
      'todo',
      'projects',
      'meals',
      'inventory',
      'spending',
      'grocery',
    ]);
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockWindowWidth = 1200;
  });

  it('compacts to a rail with only the logo, then opens again on the next click', async () => {
    render(<AppShell>{null}</AppShell>);
    await act(async () => {});

    // Open: the wordmark and the item labels are there.
    expect(screen.getByText('DlaiLog')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-toggle')).toBeExpanded();

    fireEvent.press(screen.getByTestId('sidebar-toggle'));

    // Compacted: the logo stays, the labels go.
    expect(screen.getByTestId('app-shell-sidebar')).toBeOnTheScreen();
    expect(screen.getByTestId('nav-home')).toBeOnTheScreen();
    expect(screen.queryByText('DlaiLog')).not.toBeOnTheScreen();
    expect(screen.queryByText('Home')).not.toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-toggle')).not.toBeExpanded();
    expect(await AsyncStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('collapsed');

    fireEvent.press(screen.getByTestId('sidebar-toggle'));

    expect(screen.getByText('DlaiLog')).toBeOnTheScreen();
    expect(screen.getByTestId('sidebar-toggle')).toBeExpanded();
  });

  it('expands a compacted rail while the pointer is over it', async () => {
    await AsyncStorage.setItem(SIDEBAR_STORAGE_KEY, 'collapsed');
    render(<AppShell>{null}</AppShell>);
    await act(async () => {});

    expect(screen.queryByText('Home')).not.toBeOnTheScreen();

    fireEvent(screen.getByTestId('app-shell-sidebar'), 'pointerEnter');
    expect(screen.getByText('Home')).toBeOnTheScreen();

    fireEvent(screen.getByTestId('app-shell-sidebar'), 'pointerLeave');
    expect(screen.queryByText('Home')).not.toBeOnTheScreen();
  });
});
