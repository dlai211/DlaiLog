import { expect, test } from '@playwright/test';

/**
 * The acceptance criteria from PRD §10 that need a real browser: the app
 * loads, everything persists across a refresh, the layout follows the window
 * width, and a backup really downloads.
 */

test('opens in the browser with all five sections', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('DlaiLog')).toBeVisible();
  for (const id of ['home', 'todo', 'projects', 'spending', 'grocery']) {
    await expect(page.getByTestId(`nav-${id}`)).toBeVisible();
  }

  await page.getByTestId('nav-todo').click();
  await expect(page).toHaveURL(/\/todo$/);
  await expect(page.getByTestId('todo-view')).toBeVisible();
});

test('a task added on Home survives a browser refresh', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('home-quick-task').fill('Buy paint');
  await page.getByTestId('home-quick-task-add').click();
  await expect(page.getByText('Buy paint')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Buy paint')).toBeVisible();

  // Close the page and open the app again — same storage, same data.
  await page.close();
  const reopened = await page.context().newPage();
  await reopened.goto('/');
  await expect(reopened.getByText('Buy paint')).toBeVisible();
});

test('a purchase logged in Spending appears in the Grocery Tracker, with its unit price', async ({
  page,
}) => {
  await page.goto('/spending');

  await page.getByTestId('new-purchase').click();
  await page.getByTestId('purchase-name').fill('Soy sauce');
  await page.getByTestId('purchase-icon-search').fill('soy');
  await page.getByTestId('purchase-icon-option-0').click();
  await page.getByTestId('purchase-category-condiment').click();
  await page.getByTestId('purchase-amount').fill('1');
  await page.getByTestId('purchase-unit').click();
  await page.getByTestId('purchase-unit-option-L').click();
  await page.getByTestId('purchase-total').fill('6.45');

  await expect(page.getByTestId('unit-price-preview')).toContainText('= $6.45 per L');

  await page.getByTestId('purchase-store').fill('Asia Market');
  await page.getByTestId('purchase-save').click();

  await expect(page.getByText('Asia Market · 1 L · $6.45/L')).toBeVisible();

  await page.getByTestId('nav-grocery').click();
  await expect(page.getByTestId('grocery-name-soy sauce')).toBeVisible();
  await expect(page.getByTestId('grocery-price-soy sauce')).toHaveText('$6.45/L');

  // The tracker survives a refresh too.
  await page.reload();
  await expect(page.getByTestId('grocery-name-soy sauce')).toBeVisible();
});

test('the sidebar becomes a bottom bar when the window is narrow', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('app-shell-sidebar')).toBeVisible();
  await expect(page.getByTestId('app-shell-bottom-bar')).toHaveCount(0);

  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.getByTestId('app-shell-bottom-bar')).toBeVisible();
  await expect(page.getByTestId('app-shell-sidebar')).toHaveCount(0);
});

test('Escape closes a pop-up', async ({ page }) => {
  await page.goto('/spending');

  await page.getByTestId('new-purchase').click();
  await expect(page.getByTestId('purchase-form')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('purchase-form')).toHaveCount(0);
});

test('downloading a backup really produces a file', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('backup-button').click();
  await expect(page.getByTestId('backup-modal')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('backup-download').click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^dlailog-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText('Backup file downloaded.')).toBeVisible();
});
