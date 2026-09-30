import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import TodoScreen from '@/app/todo';
import { ToastProvider } from '@/components/ui/toast';
import { addDays, todayKey } from '@/lib/dates';
import { DataProvider } from '@/store/data-provider';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type Task } from '@/store/types';

let mockParams: Record<string, string> = {};
let mockPush: jest.Mock;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    date: '2026-09-30',
    done: false,
    createdAt: '2026-09-30T08:00:00.000Z',
    ...overrides,
  };
}

async function seed(tasks: Task[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), tasks }));
}

beforeEach(async () => {
  mockParams = {};
  mockPush = jest.fn();
  await AsyncStorage.clear();
});

describe('To-do — Day view', () => {
  it('shows timed and untimed tasks of the day from the URL', async () => {
    mockParams = { date: '2026-09-30' };
    await seed([
      makeTask({ id: 'standup', title: 'Standup meeting', time: '09:00' }),
      makeTask({ id: 'paint', title: 'Buy paint', createdAt: '2026-09-30T09:00:00.000Z' }),
      makeTask({ id: 'other', title: 'Other day task', date: '2026-10-05' }),
    ]);

    await renderScreen(<TodoScreen />);

    await waitFor(() => expect(screen.getByText('Standup meeting')).toBeOnTheScreen());
    expect(screen.getByText('Buy paint')).toBeOnTheScreen();
    expect(screen.queryByText('Other day task')).not.toBeOnTheScreen();
    expect(screen.getByText('TIMED')).toBeOnTheScreen();
    expect(screen.getByText('ANYTIME')).toBeOnTheScreen();
    expect(screen.getByText('09:00')).toBeOnTheScreen();
    expect(screen.getByText('Wed, Sep 30')).toBeOnTheScreen();
  });

  it('shows the friendly empty state for a day with nothing on it', async () => {
    mockParams = { date: '2026-09-30' };
    await renderScreen(<TodoScreen />);

    await waitFor(() =>
      expect(screen.getByText('Nothing planned — enjoy it.')).toBeOnTheScreen()
    );
  });

  it('ticks a task into Done and back', async () => {
    mockParams = { date: '2026-09-30' };
    await seed([makeTask({ id: 'paint', title: 'Buy paint' })]);
    await renderScreen(<TodoScreen />);
    await waitFor(() => expect(screen.getByText('Buy paint')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('task-check-paint'));
    await waitFor(() => expect(screen.getByText('Done (1)')).toBeOnTheScreen());

    // Open the Done section: the finished task is there.
    fireEvent.press(screen.getByTestId('todo-done-toggle'));
    expect(screen.getByTestId('task-row-paint')).toBeOnTheScreen();

    // Untick: it returns to the open list.
    fireEvent.press(screen.getByTestId('task-check-paint'));
    await waitFor(() => expect(screen.queryByText('Done (1)')).not.toBeOnTheScreen());
  });

  it('adds a task with a time from the form', async () => {
    mockParams = { date: '2026-09-30' };
    await renderScreen(<TodoScreen />);
    await waitFor(() =>
      expect(screen.getByText('Nothing planned — enjoy it.')).toBeOnTheScreen()
    );

    fireEvent.press(screen.getByTestId('new-task'));
    fireEvent.changeText(screen.getByTestId('task-title-input'), 'Call supplier');
    fireEvent.press(screen.getByTestId('task-time-toggle'));
    fireEvent.press(screen.getByTestId('task-save'));

    await waitFor(() => expect(screen.getByText('Call supplier')).toBeOnTheScreen());
    expect(screen.getByText('09:00')).toBeOnTheScreen(); // default time, shown as a chip

    // It must be stored on the day shown in the URL, with its time.
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = JSON.parse(raw as string).tasks[0];
      expect(saved).toMatchObject({ title: 'Call supplier', date: '2026-09-30', time: '09:00' });
    });
  });

  it('shows overdue tasks when viewing today, and not on other days', async () => {
    const today = todayKey();
    await seed([
      makeTask({ id: 'late', title: 'Pay the bill', date: addDays(today, -2) }),
    ]);

    mockParams = { date: today };
    const view = await renderScreen(<TodoScreen />);
    await waitFor(() => expect(screen.getByText('Overdue (1)')).toBeOnTheScreen());
    expect(screen.getByText('Pay the bill')).toBeOnTheScreen();

    // Moving to another day (same as the URL changing) hides the Overdue group.
    mockParams = { date: addDays(today, 1) };
    await act(async () => {
      view.rerender(
        <ToastProvider>
          <DataProvider>
            <TodoScreen />
          </DataProvider>
        </ToastProvider>
      );
    });
    await waitFor(() => expect(screen.queryByText('Overdue (1)')).not.toBeOnTheScreen());
  });

  it('walks day by day and jumps back to today through the URL', async () => {
    mockParams = { date: '2026-09-30' };
    await renderScreen(<TodoScreen />);

    fireEvent.press(screen.getByTestId('todo-next'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { date: '2026-10-01' },
    });

    fireEvent.press(screen.getByTestId('todo-prev'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { date: '2026-09-29' },
    });

    fireEvent.press(screen.getByTestId('todo-today'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { date: todayKey() },
    });
  });

  it('saves when Enter is pressed in the title field', async () => {
    mockParams = { date: '2026-09-30' };
    await renderScreen(<TodoScreen />);
    await waitFor(() =>
      expect(screen.getByText('Nothing planned — enjoy it.')).toBeOnTheScreen()
    );

    fireEvent.press(screen.getByTestId('new-task'));
    fireEvent.changeText(screen.getByTestId('task-title-input'), 'Enter key task');
    fireEvent(screen.getByTestId('task-title-input'), 'submitEditing');

    await waitFor(() => expect(screen.getByText('Enter key task')).toBeOnTheScreen());
  });

  it('jumps to a day from the week strip', async () => {
    mockParams = { date: '2026-09-30' };
    await renderScreen(<TodoScreen />);

    // 2026-09-30 is a Wednesday; the strip runs Mon 28 Sep … Sun 4 Oct.
    fireEvent.press(screen.getByTestId('week-strip-day-2026-09-28'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { date: '2026-09-28' },
    });
  });

  it('deletes a task only after confirmation', async () => {
    mockParams = { date: '2026-09-30' };
    await seed([makeTask({ id: 'paint', title: 'Buy paint' })]);
    await renderScreen(<TodoScreen />);
    await waitFor(() => expect(screen.getByText('Buy paint')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('task-delete-paint'));
    expect(screen.getByText('Delete this task?')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    expect(screen.getByText('Buy paint')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('task-delete-paint'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.queryByText('Buy paint')).not.toBeOnTheScreen());
  });
});

describe('To-do — Month view', () => {
  it('shows up to three chips per day plus "+N more"', async () => {
    mockParams = { date: '2026-09-30' };
    await seed([
      makeTask({ id: 'm1', title: 'Task one', date: '2026-09-15' }),
      makeTask({ id: 'm2', title: 'Task two', date: '2026-09-15' }),
      makeTask({ id: 'm3', title: 'Task three', date: '2026-09-15' }),
      makeTask({ id: 'm4', title: 'Task four', date: '2026-09-15' }),
      makeTask({ id: 'm5', title: 'Task five', date: '2026-09-15' }),
    ]);

    await renderScreen(<TodoScreen />);
    fireEvent.press(screen.getByTestId('todo-view-month'));

    await waitFor(() =>
      expect(screen.getByTestId('month-more-2026-09-15')).toBeOnTheScreen()
    );
    expect(screen.getAllByTestId(/^month-task-/)).toHaveLength(3);
    expect(screen.getByText('+2 more')).toBeOnTheScreen();
    expect(screen.getByText('September 2026')).toBeOnTheScreen();
  });

  it('walks between months', async () => {
    mockParams = { date: '2026-09-30' };
    await renderScreen(<TodoScreen />);
    fireEvent.press(screen.getByTestId('todo-view-month'));

    expect(screen.getByTestId('todo-month-title')).toHaveTextContent('September 2026');
    fireEvent.press(screen.getByTestId('todo-next-month'));
    expect(screen.getByTestId('todo-month-title')).toHaveTextContent('October 2026');
    fireEvent.press(screen.getByTestId('todo-prev-month'));
    fireEvent.press(screen.getByTestId('todo-prev-month'));
    expect(screen.getByTestId('todo-month-title')).toHaveTextContent('August 2026');
  });

  it('opens the editor when a chip is pressed, and the Day view when a day is pressed', async () => {
    mockParams = { date: '2026-09-30' };
    await seed([makeTask({ id: 'm1', title: 'Task one', date: '2026-09-15' })]);
    await renderScreen(<TodoScreen />);
    fireEvent.press(screen.getByTestId('todo-view-month'));
    await waitFor(() => expect(screen.getByTestId('month-task-m1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('month-task-m1'));
    expect(screen.getByTestId('task-form')).toBeOnTheScreen();
    expect(screen.getByTestId('task-title-input').props.value).toBe('Task one');
    fireEvent.press(screen.getByTestId('task-cancel'));

    fireEvent.press(screen.getByTestId('todo-month-grid-day-2026-09-20'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/todo',
      params: { date: '2026-09-20' },
    });
    expect(screen.getByTestId('todo-view-day')).toBeSelected();
  });
});
