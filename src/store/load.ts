/**
 * Deciding what the app should open with (PRD §32).
 *
 * The cloud is the source of truth, but the app must never be *unopenable*
 * because a network is down: every load starts from the copy already on the
 * device, and a failed cloud read falls back to it rather than emptying the
 * screen.
 *
 * Loading also handles the one-time move of data that was saved before the
 * cloud existed. If the database turns out to be empty while this device has
 * real data, the device's copy is uploaded — which is why the first launch
 * after the switch looks exactly like the last launch before it.
 */

import { dbToRows, rowsToDb, type RowSet } from '@/store/rows';
import { loadDB, saveDB } from '@/store/storage';
import { fetchAll, isCloudEnabled, uploadAll } from '@/store/cloud';
import { isEmptyDB, type DB } from '@/store/types';

export interface LoadResult {
  db: DB;
  /** Where the data came from. */
  source: 'local' | 'cloud';
  /**
   * Something worth telling the user about — a cloud that could not be
   * reached, or a first upload that did not go through. The app carries on
   * with the device's copy either way.
   */
  warning?: string;
}

export async function loadDatabase(): Promise<LoadResult> {
  const local = await loadDB();

  // No cloud configured (a fresh clone with no `.env`), or running under test:
  // the device's own copy is the whole story, exactly as before.
  if (!isCloudEnabled()) {
    return { db: local, source: 'local' };
  }

  let cloud: RowSet;
  try {
    cloud = await fetchAll();
  } catch (error) {
    return {
      db: local,
      source: 'local',
      warning:
        'Could not reach the cloud — showing the copy saved on this device. ' +
        (error instanceof Error ? `(${error.message})` : ''),
    };
  }

  const cloudDb = rowsToDb(cloud);

  // The database has nothing in it, but this device does: this is the first
  // launch after moving to the cloud, so the device's copy becomes the
  // starting point rather than being stranded.
  if (isEmptyDB(cloudDb) && !isEmptyDB(local)) {
    try {
      await uploadAll(dbToRows(local));
      return { db: local, source: 'local' };
    } catch (error) {
      return {
        db: local,
        source: 'local',
        warning:
          'Could not upload the data already on this device to the cloud. ' +
          'It is safe here, and will be sent the next time a change is saved. ' +
          (error instanceof Error ? `(${error.message})` : ''),
      };
    }
  }

  // Keep the device's copy in step with the cloud. Failing to write the cache
  // is not worth interrupting anyone over — the data is safely in the cloud.
  saveDB(cloudDb).catch(() => {});

  return { db: cloudDb, source: 'cloud' };
}
