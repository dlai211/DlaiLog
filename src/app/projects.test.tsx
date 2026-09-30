import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ProjectsScreen from '@/app/projects';
import { ToastProvider } from '@/components/ui/toast';
import { addDays, todayKey } from '@/lib/dates';
import { DataProvider } from '@/store/data-provider';
import { STORAGE_KEY } from '@/store/storage';
import { emptyDB, type Project } from '@/store/types';

function makeProject(overrides: Partial<Project> = {}): Project {
  const stamp = '2026-09-30T08:00:00.000Z';
  return {
    id: 'p1',
    name: 'DlaiLog website',
    status: 'in-progress',
    progress: 40,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

async function seed(projects: Project[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), projects }));
}

function renderScreen() {
  return render(
    <ToastProvider>
      <DataProvider>
        <ProjectsScreen />
      </DataProvider>
    </ToastProvider>
  );
}

async function waitForProject(name: string) {
  await waitFor(() => expect(screen.getByText(name)).toBeOnTheScreen());
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Projects screen', () => {
  it('shows a friendly empty state when there are no projects', async () => {
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText('No projects yet — add your first one.')).toBeOnTheScreen()
    );
  });

  it('lists saved projects with progress, status and due labels', async () => {
    await seed([
      makeProject({ id: 'p1', name: 'DlaiLog website', progress: 40, targetDate: addDays(todayKey(), 3) }),
      makeProject({
        id: 'p2',
        name: 'Mobile app',
        status: 'not-started',
        progress: 0,
        targetDate: addDays(todayKey(), -3),
      }),
    ]);

    renderScreen();

    await waitForProject('DlaiLog website');
    expect(screen.getByText('Mobile app')).toBeOnTheScreen();
    expect(screen.getByText('40%')).toBeOnTheScreen();
    expect(screen.getByText(/3 days left/)).toBeOnTheScreen();
    expect(screen.getByText(/Overdue/)).toBeOnTheScreen();
    expect(screen.getByText('In progress')).toBeOnTheScreen();
    expect(screen.getByText('Not started')).toBeOnTheScreen();
  });

  it('creates a project through the add form and saves it', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('new-project')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-project'));
    expect(screen.getByTestId('project-form')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('project-name'), 'Bike shed');
    fireEvent.press(screen.getByTestId('project-status-in-progress'));
    fireEvent.press(screen.getByTestId('project-progress-increase'));
    fireEvent.press(screen.getByTestId('project-progress-increase'));
    fireEvent.press(screen.getByTestId('project-save'));

    await waitForProject('Bike shed');
    expect(screen.getByText('10%')).toBeOnTheScreen(); // two nudges of 5% from 0
    expect(screen.queryByTestId('project-form')).not.toBeOnTheScreen();

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(raw).toContain('Bike shed');
    });
  });

  it('refuses to save without a name', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId('new-project')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('new-project'));
    fireEvent.press(screen.getByTestId('project-save'));

    expect(screen.getByText('Name is required')).toBeOnTheScreen();
    expect(screen.getByTestId('project-form')).toBeOnTheScreen();
  });

  it('opens the edit form pre-filled and saves progress changes', async () => {
    await seed([makeProject({ id: 'p1', name: 'DlaiLog website', progress: 40 })]);
    renderScreen();
    await waitForProject('DlaiLog website');

    fireEvent.press(screen.getByTestId('project-card-p1'));
    expect(screen.getByTestId('project-name').props.value).toBe('DlaiLog website');

    fireEvent.press(screen.getByTestId('project-progress-increase'));
    fireEvent.press(screen.getByTestId('project-save'));

    await waitFor(() => expect(screen.getByText('45%')).toBeOnTheScreen());
    expect(screen.queryByTestId('project-form')).not.toBeOnTheScreen();
  });

  it('filters between all, active and done', async () => {
    await seed([
      makeProject({ id: 'p1', name: 'DlaiLog website', status: 'in-progress' }),
      makeProject({ id: 'p2', name: 'Mobile app', status: 'done' }),
    ]);
    renderScreen();
    await waitForProject('DlaiLog website');

    fireEvent.press(screen.getByTestId('project-filter-done'));
    expect(screen.getByText('Mobile app')).toBeOnTheScreen();
    expect(screen.queryByText('DlaiLog website')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('project-filter-active'));
    expect(screen.getByText('DlaiLog website')).toBeOnTheScreen();
    expect(screen.queryByText('Mobile app')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('project-filter-all'));
    expect(screen.getByText('DlaiLog website')).toBeOnTheScreen();
    expect(screen.getByText('Mobile app')).toBeOnTheScreen();
  });

  it('asks for confirmation before deleting and then removes the project', async () => {
    await seed([makeProject({ id: 'p1', name: 'DlaiLog website' })]);
    renderScreen();
    await waitForProject('DlaiLog website');

    fireEvent.press(screen.getByTestId('project-delete-p1'));
    expect(screen.getByText('Delete this project?')).toBeOnTheScreen();

    // Cancel first — nothing may happen.
    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    expect(screen.getByText('DlaiLog website')).toBeOnTheScreen();

    // Now really delete.
    fireEvent.press(screen.getByTestId('project-delete-p1'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(screen.queryByText('DlaiLog website')).not.toBeOnTheScreen());
    expect(screen.getByText('No projects yet — add your first one.')).toBeOnTheScreen();

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw as string).projects).toHaveLength(0);
    });
  });
});
