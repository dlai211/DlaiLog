import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BackupModal } from '@/components/domain/backup-modal';
import { downloadTextFile, pickTextFile, serializeBackup } from '@/store/backup';
import { STORAGE_KEY } from '@/store/storage';
import { renderScreen } from '@/test/helpers';
import { emptyDB, type DB } from '@/store/types';

// The two functions that talk to the browser are replaced; everything else
// in the backup module (the format, the validation) stays real.
jest.mock('@/store/backup', () => {
  const actual = jest.requireActual('@/store/backup');
  return {
    ...actual,
    downloadTextFile: jest.fn(() => true),
    pickTextFile: jest.fn(),
  };
});

const mockDownload = downloadTextFile as jest.Mock;
const mockPick = pickTextFile as jest.Mock;

const restoredDB: DB = {
  ...emptyDB(),
  tasks: [
    {
      id: 'restored-1',
      title: 'Restored task',
      date: '2026-09-30',
      done: false,
      createdAt: '2026-09-30T08:00:00.000Z',
    },
  ],
};

async function seed(partial: Partial<DB>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDB(), ...partial }));
}

function renderModal(onClose: () => void = () => {}) {
  return renderScreen(<BackupModal visible onClose={onClose} />);
}

beforeEach(async () => {
  mockDownload.mockClear();
  mockDownload.mockReturnValue(true);
  mockPick.mockReset();
  await AsyncStorage.clear();
});

describe('BackupModal', () => {
  it('downloads the whole database as a dated backup file', async () => {
    await seed({
      purchases: [
        {
          id: 'pu1',
          date: '2026-09-28',
          itemName: 'Soy sauce',
          icon: '🍜',
          category: 'condiment',
          amount: 1,
          unit: 'L',
          totalPrice: 6.45,
          store: 'Asia Market',
          createdAt: '2026-09-28T10:00:00.000Z',
        },
      ],
    });

    await renderModal();
    fireEvent.press(screen.getByTestId('backup-download'));

    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
    const [filename, text] = mockDownload.mock.calls[0];
    expect(filename).toMatch(/^dlailog-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const backup = JSON.parse(text as string);
    expect(backup.app).toBe('dlailog');
    expect(backup.data.purchases).toHaveLength(1);
    expect(backup.data.purchases[0].itemName).toBe('Soy sauce');

    expect(screen.getByText('Backup file downloaded.')).toBeOnTheScreen();
  });

  it('reports when the browser cannot download', async () => {
    mockDownload.mockReturnValue(false);
    await renderModal();

    fireEvent.press(screen.getByTestId('backup-download'));

    expect(screen.getByText(/cannot download files/)).toBeOnTheScreen();
  });

  it('restores a valid backup only after the "replace everything" warning', async () => {
    await seed({
      tasks: [
        {
          id: 'old',
          title: 'Old task',
          date: '2026-09-29',
          done: false,
          createdAt: '2026-09-29T08:00:00.000Z',
        },
      ],
    });
    mockPick.mockResolvedValue({ name: 'dlailog-backup-2026-09-30.json', text: serializeBackup(restoredDB) });

    const onClose = jest.fn();
    await renderModal(onClose);

    fireEvent.press(screen.getByTestId('backup-restore'));

    // The warning comes first.
    await waitFor(() => expect(screen.getByText('Replace everything?')).toBeOnTheScreen());
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('Old task');

    fireEvent.press(screen.getByTestId('backup-confirm-confirm'));

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = JSON.parse(raw as string);
      expect(saved.tasks).toHaveLength(1);
      expect(saved.tasks[0].title).toBe('Restored task');
    });
    expect(screen.getByText('Backup restored.')).toBeOnTheScreen();
    expect(onClose).toHaveBeenCalled();
  });

  it('can be cancelled at the warning, leaving the data alone', async () => {
    await seed({
      tasks: [
        {
          id: 'old',
          title: 'Old task',
          date: '2026-09-29',
          done: false,
          createdAt: '2026-09-29T08:00:00.000Z',
        },
      ],
    });
    mockPick.mockResolvedValue({ name: 'backup.json', text: serializeBackup(restoredDB) });

    await renderModal();
    fireEvent.press(screen.getByTestId('backup-restore'));
    await waitFor(() => expect(screen.getByText('Replace everything?')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('backup-confirm-cancel'));

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string).tasks[0].title).toBe('Old task');
  });

  it('refuses a file that is not a DlaiLog backup and changes nothing', async () => {
    await seed({
      tasks: [
        {
          id: 'old',
          title: 'Old task',
          date: '2026-09-29',
          done: false,
          createdAt: '2026-09-29T08:00:00.000Z',
        },
      ],
    });
    mockPick.mockResolvedValue({ name: 'something-else.json', text: '{"hello": "world"}' });

    await renderModal();
    fireEvent.press(screen.getByTestId('backup-restore'));

    await waitFor(() => expect(screen.getByTestId('backup-error')).toBeOnTheScreen());
    expect(screen.getByTestId('backup-error')).toHaveTextContent(/not created by DlaiLog/);

    // No confirmation appeared and the data is untouched.
    expect(screen.queryByText('Replace everything?')).not.toBeOnTheScreen();
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string).tasks[0].title).toBe('Old task');
  });

  it('does nothing when the file picker is dismissed', async () => {
    mockPick.mockResolvedValue(null);
    await renderModal();

    fireEvent.press(screen.getByTestId('backup-restore'));

    await waitFor(() => expect(mockPick).toHaveBeenCalled());
    expect(screen.queryByText('Replace everything?')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('backup-error')).not.toBeOnTheScreen();
  });
});
