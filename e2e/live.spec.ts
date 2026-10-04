import { expect, test } from '@playwright/test';

/**
 * The one spec that talks to the **real** Supabase project, with the real app
 * in a real browser.
 *
 * Everything else in the suite sets `dlailog:no-cloud`, so it never leaves the
 * machine. That shows the app asks Supabase for the right things, but not that
 * Supabase agrees — and a stand-in cannot tell you that the publishable key
 * works, that a row is accepted, or that what comes back has the shape the app
 * expects. This file closes that gap.
 *
 * It is skipped unless asked for (`npm run test:live`), because it needs a
 * network and it writes to a personal database. Two rules keep that safe:
 *
 *   - it only ever creates rows marked with `live-check`, and it sweeps them
 *     up afterwards, including when a test fails;
 *   - it sets `dlailog:no-seed` but deliberately *not* `dlailog:no-cloud`, and
 *     the seed flag is what stops a brand-new browser mistaking the empty
 *     database for a fresh install and pushing the whole example dataset up.
 */

const MARKER = 'live-check';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function authHeaders() {
  return { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` };
}

/** How many marked rows the database holds for one table. */
async function markedRows(
  request: import('@playwright/test').APIRequestContext,
  table: string,
  column: string,
) {
  const response = await request.get(
    `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${MARKER}&select=id`,
    { headers: authHeaders() },
  );
  return ((await response.json()) as unknown[]).length;
}

/** Removes every marked row, whatever happened. */
async function sweep(request: import('@playwright/test').APIRequestContext) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  for (const [table, column] of [
    ['tasks', 'title'],
    ['notes', 'text'],
    ['projects', 'name'],
    ['purchases', 'item_name'],
    ['inventory', 'name'],
    ['meals', 'name'],
    ['shopping', 'name'],
  ]) {
    await request.delete(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${MARKER}`, {
      headers: authHeaders(),
    });
  }
}

/** Adds a marked task through the interface, the way a person would. */
async function addMarkedTask(page: import('@playwright/test').Page) {
  await page.getByTestId('nav-todo').click();
  await page.getByTestId('new-task').click();
  await page.getByTestId('task-title-input').fill(MARKER);
  await page.getByTestId('task-save').click();
}

/** The row for the marked task, found by its text rather than by its id. */
function markedRow(page: import('@playwright/test').Page) {
  return page.locator('[data-testid^="task-row-"]').filter({ hasText: MARKER });
}

test.beforeEach(async ({ page, request }) => {
  await sweep(request);
  await page.addInitScript(() => {
    // No example data; the cloud is left on, which is the point of this file.
    window.localStorage.setItem('dlailog:no-seed', '1');
  });
});

test.afterEach(async ({ request }) => {
  await sweep(request);
});

test('the app writes to Supabase, and reads it back with the browser emptied', async ({
  page,
  request,
}) => {
  test.skip(!SUPABASE_URL, 'No Supabase project configured.');

  await page.goto('/');
  await expect(page.getByText('DlaiLog')).toBeVisible();

  await addMarkedTask(page);
  await expect(markedRow(page)).toHaveCount(1);

  // It reached the database, not just the screen.
  await expect.poll(() => markedRows(request, 'tasks', 'title')).toBe(1);

  // Throw away everything the browser is holding, so nothing left on this
  // device could account for what appears next.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  // Still there — which can only mean it came back from the database.
  await expect(markedRow(page)).toHaveCount(1);
  await expect(markedRow(page)).toContainText(MARKER);
});

test('a task added on one device appears on another', async ({ browser, request }) => {
  test.skip(!SUPABASE_URL, 'No Supabase project configured.');

  // Two browser contexts share nothing, so they are two devices as far as the
  // app is concerned — a phone and a laptop.
  const laptop = await browser.newContext();
  const phone = await browser.newContext();
  const noSeeding = () => window.localStorage.setItem('dlailog:no-seed', '1');

  try {
    const laptopPage = await laptop.newPage();
    await laptopPage.addInitScript(noSeeding);
    await laptopPage.goto('/');
    await addMarkedTask(laptopPage);
    await expect(markedRow(laptopPage)).toHaveCount(1);

    // The other device has never seen this task and has nothing stored.
    const phonePage = await phone.newPage();
    await phonePage.addInitScript(noSeeding);
    await phonePage.goto('/');
    await phonePage.getByTestId('nav-todo').click();
    await expect(markedRow(phonePage)).toHaveCount(1);
  } finally {
    await laptop.close();
    await phone.close();
    await sweep(request);
  }
});

test('deleting in the app removes the row from the database', async ({ page, request }) => {
  test.skip(!SUPABASE_URL, 'No Supabase project configured.');

  await page.goto('/');
  await addMarkedTask(page);
  await expect.poll(() => markedRows(request, 'tasks', 'title')).toBe(1);

  // The delete button is named after the row's own id, so read it off the row.
  const testId = await markedRow(page).getAttribute('data-testid');
  const id = testId?.replace('task-row-', '');
  expect(id).toBeTruthy();

  await page.getByTestId(`task-delete-${id}`).click();

  // Confirm, if the app asks. (`confirm-dialog-confirm`.)
  const confirm = page.locator('[data-testid$="-confirm"]').last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();

  await expect.poll(() => markedRows(request, 'tasks', 'title')).toBe(0);
  await expect(markedRow(page)).toHaveCount(0);
});
