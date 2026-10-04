import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { addDays, currentMonthKey, shiftMonthKey, todayKey, weekStrip } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type DB, type Purchase, type Task } from '@/store/types';

let mockPush: jest.Mock;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const today = todayKey();
const thisMonth = currentMonthKey();

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    date: today,
    done: false,
    createdAt: `${today}T08:00:00.000Z`,
    ...overrides,
  };
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pu1',
    date: `${thisMonth}-05`,
    itemName: 'Soy sauce',
    icon: '🍜',
    category: 'condiment',
    amount: 1,
    unit: 'L',
    totalPrice: 6.45,
    store: 'Asia Market',
    createdAt: `${thisMonth}-05T10:00:00.000Z`,
    ...overrides,
  };
}

async function seed(partial: Partial<DB>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), ...partial }));
}

beforeEach(async () => {
  mockPush = jest.fn();
  await AsyncStorage.clear();
});

describe('Home — Today’s Plan', () => {
  it('shows today’s timed and untimed tasks and both quick actions', async () => {
    await seed({
      tasks: [
        makeTask({ id: 'standup', title: 'Standup meeting', time: '09:00' }),
        makeTask({ id: 'paint', title: 'Buy paint', createdAt: `${today}T09:00:00.000Z` }),
        makeTask({ id: 'later', title: 'Next week thing', date: addDays(today, 7) }),
      ],
    });

    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByText('Standup meeting')).toBeOnTheScreen());
    expect(screen.getByText('Buy paint')).toBeOnTheScreen();
    expect(screen.queryByText('Next week thing')).not.toBeOnTheScreen();
    expect(screen.getByText('9:00 am')).toBeOnTheScreen();
  });

  it('ticks a task off, and back on, from Home', async () => {
    await seed({ tasks: [makeTask({ id: 'paint', title: 'Buy paint' })] });
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Buy paint')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('task-check-paint'));

    // It leaves the open list and appears in "Done today".
    await waitFor(() => expect(screen.getByText('Done today (1)')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('home-done-toggle'));
    expect(screen.getByTestId('task-row-paint')).toBeOnTheScreen();

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).tasks[0].done).toBe(true);
    });

    // Unticking restores it.
    fireEvent.press(screen.getByTestId('task-check-paint'));
    await waitFor(() => expect(screen.queryByText('Done today (1)')).not.toBeOnTheScreen());
  });

  it('pins overdue tasks in red', async () => {
    await seed({ tasks: [makeTask({ id: 'late', title: 'Pay the bill', date: addDays(today, -2) })] });
    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByText('Overdue (1)')).toBeOnTheScreen());
    expect(screen.getByText('Pay the bill')).toBeOnTheScreen();
    expect(screen.getByTestId('task-date-late')).toBeOnTheScreen();
  });

  it('adds a task for today through the quick-add box', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText('Nothing planned today — enjoy it.')).toBeOnTheScreen()
    );

    fireEvent.changeText(screen.getByTestId('home-quick-task'), 'Water the plants');
    fireEvent.press(screen.getByTestId('home-quick-task-add'));

    await waitFor(() => expect(screen.getByText('Water the plants')).toBeOnTheScreen());
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).tasks[0]).toMatchObject({
        title: 'Water the plants',
        date: today,
        done: false,
      });
    });
  });

  it('adds a task through the full form', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByTestId('home-new-task')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('home-new-task'));
    fireEvent.changeText(screen.getByTestId('task-title-input'), 'Book the dentist');
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => expect(screen.getByText('Book the dentist')).toBeOnTheScreen());
  });

  it('jumps to a day from the week strip', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByTestId('home-week-strip')).toBeOnTheScreen());

    // Any day of the shown week other than today — "today + 2" falls outside
    // the strip when today is Saturday or Sunday.
    const target = weekStrip(today).find((key) => key !== today)!;

    fireEvent.press(screen.getByTestId(`home-week-strip-day-${target}`));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/todo', params: { date: target } });
  });
});

describe('Home — Quick Notes', () => {
  it('adds and deletes notes, with Undo', async () => {
    await renderScreen(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('No notes yet — jot something down.')).toBeOnTheScreen());

    fireEvent.changeText(screen.getByTestId('home-note-input'), 'Call plumber about sink');
    fireEvent.press(screen.getByTestId('home-note-add'));
    await waitFor(() => expect(screen.getByText('Call plumber about sink')).toBeOnTheScreen());

    const noteId = (await AsyncStorage.getItem(STORAGE_KEY))!;
    expect(JSON.parse(noteId).notes).toHaveLength(1);

    fireEvent.press(screen.getByTestId(/^home-note-delete-/));
    await waitFor(() => expect(screen.queryByText('Call plumber about sink')).not.toBeOnTheScreen());
    expect(screen.getByText('Note deleted')).toBeOnTheScreen();

    // Undo brings the note back.
    fireEvent.press(screen.getByTestId('toast-action'));
    await waitFor(() => expect(screen.getByText('Call plumber about sink')).toBeOnTheScreen());

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string).notes).toHaveLength(1);
  });
});

describe('Home — module summaries', () => {
  it('summarises spending against last month', async () => {
    await seed({
      purchases: [
        makePurchase({ id: 'a', totalPrice: 30 }),
        makePurchase({ id: 'b', itemName: 'Rice', totalPrice: 10, createdAt: `${thisMonth}-06T10:00:00.000Z` }),
        makePurchase({
          id: 'c',
          itemName: 'Old thing',
          date: `${shiftMonthKey(thisMonth, -1)}-05`,
          totalPrice: 20,
          createdAt: `${shiftMonthKey(thisMonth, -1)}-05T10:00:00.000Z`,
        }),
      ],
    });

    await renderScreen(<HomeScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('home-spending-total')).toHaveTextContent(formatMoney(40))
    );
    expect(screen.getByTestId('home-spending-change')).toHaveTextContent('▲ +100% vs last month');
    expect(screen.getByText(/2 entries · Top: Condiment/)).toBeOnTheScreen();
  });

  it('shows project progress bars and navigates to the module', async () => {
    await seed({
      projects: [
        {
          id: 'p1',
          name: 'DlaiLog website',
          status: 'in-progress',
          progress: 72,
          targetDate: addDays(today, 3),
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-01T08:00:00.000Z',
        },
      ],
    });

    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByText('DlaiLog website')).toBeOnTheScreen());
    expect(screen.getByTestId('home-project-bar-p1').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 72,
    });
    expect(screen.getByText('3 days left')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('home-projects'));
    expect(mockPush).toHaveBeenCalledWith('/projects');
  });

  it('watches grocery price moves and navigates there', async () => {
    await seed({
      purchases: [
        makePurchase({ id: 'o1', itemName: 'Olive oil', date: `${thisMonth}-01`, totalPrice: 5 }),
        makePurchase({
          id: 'o2',
          itemName: 'Olive oil',
          date: `${thisMonth}-15`,
          totalPrice: 6,
          createdAt: `${thisMonth}-15T10:00:00.000Z`,
        }),
      ],
    });

    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByTestId('home-mover-olive oil')).toBeOnTheScreen());
    expect(screen.getByTestId('home-mover-olive oil')).toHaveTextContent(/Olive oil.*▲ \+20%/);

    fireEvent.press(screen.getByTestId('home-grocery'));
    expect(mockPush).toHaveBeenCalledWith('/grocery');

    fireEvent.press(screen.getByTestId('home-spending'));
    expect(mockPush).toHaveBeenCalledWith('/spending');
  });
});

describe('Home — the at-a-glance row', () => {
  it('shows one number per module, in the module’s colour', async () => {
    await seed({
      tasks: [makeTask({ id: 'a' }), makeTask({ id: 'b', time: '09:00' }), makeTask({ id: 'c', done: true })],
      purchases: [makePurchase({ totalPrice: 12.5 })],
      shopping: [
        { id: 's1', name: 'Milk', key: 'milk', source: 'inventory', done: false, createdAt: `${today}T09:00:00.000Z` },
      ],
      inventory: [
        {
          id: 'i1',
          name: 'Milk',
          key: 'milk',
          category: 'grocery',
          quantity: 0,
          unit: 'L',
          createdAt: `${today}T09:00:00.000Z`,
          updatedAt: `${today}T09:00:00.000Z`,
        },
      ],
    });

    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByTestId('home-stats')).toBeOnTheScreen());
    // The tile shows the amount among its label and hint, so match loosely.
    expect(screen.getByTestId('home-stat-spending')).toHaveTextContent(/12\.50/);
    expect(screen.getByTestId('home-stat-tasks')).toHaveTextContent(/Open today2/);
    expect(screen.getByTestId('home-stat-pantry')).toHaveTextContent(/Out of stock1/);
    expect(screen.getByTestId('home-stat-shopping')).toHaveTextContent(/On the list1/);
  });

  it('takes you to the module it came from', async () => {
    await renderScreen(<HomeScreen />);

    await waitFor(() => expect(screen.getByTestId('home-stat-spending')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('home-stat-spending'));
    expect(mockPush).toHaveBeenCalledWith('/spending');

    fireEvent.press(screen.getByTestId('home-stat-pantry'));
    expect(mockPush).toHaveBeenCalledWith('/inventory');
  });
});
