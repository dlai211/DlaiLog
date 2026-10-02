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
  await page.getByTestId('purchase-picture-search').fill('soy');
  await page.getByTestId('purchase-picture-option-soy-sauce').click();
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

test('a purchase fills the pantry, and a meal can send what is missing to the shopping list', async ({
  page,
}) => {
  // Log a purchase — it should appear in the pantry on its own.
  await page.goto('/spending');
  await page.getByTestId('new-purchase').click();
  await page.getByTestId('purchase-name').fill('Olive oil');
  await page.getByTestId('purchase-amount').fill('1');
  await page.getByTestId('purchase-unit').click();
  await page.getByTestId('purchase-unit-option-L').click();
  await page.getByTestId('purchase-total').fill('8');
  await page.getByTestId('purchase-store').fill('SuperMart');
  await page.getByTestId('purchase-save').click();

  await page.getByTestId('nav-inventory').click();
  await expect(page.getByText('Olive oil')).toBeVisible();
  await expect(page.getByTestId('inventory-tabs-stock')).toContainText(/Stock \(1\)/);

  // A dish that needs something the pantry does not have.
  await page.getByTestId('nav-meals').click();
  await page.getByTestId('new-meal').click();
  await page.getByTestId('meal-name').fill('Garlic noodles');
  await page.getByTestId('meal-ingredient-name-0').fill('Garlic');
  await page.getByTestId('meal-save').click();

  await expect(page.locator('[data-testid^="meal-status-"]').first()).toContainText('1 missing');
  await page.locator('[data-testid^="meal-open-"]').first().click();
  await page.locator('[data-testid^="meal-add-missing-"]').first().click();

  // It lands in the shopping list, credited to the dish.
  await page.getByTestId('nav-inventory').click();
  await page.getByTestId('inventory-tabs-shopping').click();
  await expect(page.getByTestId('shopping-cart')).toContainText('Garlic');
  await expect(page.getByTestId('shopping-cart')).toContainText('from Garlic noodles');
});

test('dragging a suggestion into the cart adds it to the shopping list', async ({ page }) => {
  await page.goto('/inventory');

  // Something that has run out becomes a suggestion.
  await page.getByTestId('new-inventory-item').click();
  await page.getByTestId('inventory-name').fill('Cooking oil');
  await page.getByTestId('inventory-quantity').fill('0');
  await page.getByTestId('inventory-save').click();
  await expect(page.getByText('Cooking oil')).toBeVisible();

  await page.getByTestId('inventory-tabs-shopping').click();
  // Drag by the row's grab handle.
  const grip = page.locator('[data-testid^="suggestion-grip-"]').first();
  const cart = page.getByTestId('shopping-cart');
  await expect(grip).toBeVisible();

  const from = await grip.boundingBox();
  const to = await cart.boundingBox();
  if (!from || !to) throw new Error('Could not measure the drag start and end.');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await page.mouse.up();

  await expect(cart).toContainText('Cooking oil');
  await expect(cart).toContainText('from the pantry');
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

test('the month view shows task chips, and a chip opens the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('home-quick-task').fill('Chip task');
  await page.getByTestId('home-quick-task-add').click();
  await expect(page.getByText('Chip task')).toBeVisible();

  await page.getByTestId('nav-todo').click();
  await page.getByTestId('todo-view-month').click();

  const chip = page.locator('[data-testid^="month-task-"]').first();
  await expect(chip).toBeVisible();
  await chip.click();

  // The chip opens the editor and does not also jump into the day view.
  await expect(page.getByTestId('task-form')).toBeVisible();
  await page.getByTestId('task-cancel').click();
  await expect(page.getByTestId('todo-month-grid')).toBeVisible();
});

test('no console errors or warnings anywhere in the app', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      problems.push(`[${type}] ${message.text().split('\n')[0]}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));

  await page.goto('/');
  await expect(page.getByTestId('app-shell-sidebar')).toBeVisible();

  // Give every screen real data to render, then visit and poke each one.
  await page.getByTestId('home-quick-task').fill('Console guard task');
  await page.getByTestId('home-quick-task-add').click();
  await expect(page.getByText('Console guard task')).toBeVisible();

  await page.getByTestId('nav-projects').click();
  await page.getByTestId('new-project').click();
  await page.getByTestId('project-name').fill('Console guard project');
  await page.getByTestId('project-save').click();
  await expect(page.getByText('Console guard project')).toBeVisible();
  // Hovering the row actions inside a tappable card was the reported crash site.
  await page.locator('[data-testid^="project-edit-"]').first().hover();

  await page.getByTestId('nav-spending').click();
  await page.getByTestId('new-purchase').click();
  await page.getByTestId('purchase-cancel').click();

  await page.getByTestId('nav-todo').click();
  await page.getByTestId('todo-view-month').click();
  await page.getByTestId('todo-view-day').click();

  // Meals: a dish with an ingredient that is not in the pantry.
  await page.getByTestId('nav-meals').click();
  await page.getByTestId('new-meal').click();
  await page.getByTestId('meal-name').fill('Console guard dish');
  await page.getByTestId('meal-ingredient-name-0').fill('Pork belly');
  await page.getByTestId('meal-save').click();
  await expect(page.getByText('Console guard dish')).toBeVisible();
  await page.locator('[data-testid^="meal-open-"]').first().click();
  await expect(page.locator('[data-testid^="meal-details-"]').first()).toBeVisible();

  // Inventory: both tabs, including a stock adjustment.
  await page.getByTestId('nav-inventory').click();
  await page.getByTestId('new-inventory-item').click();
  await page.getByTestId('inventory-name').fill('Olive oil');
  await page.getByTestId('inventory-quantity').fill('2');
  await page.getByTestId('inventory-save').click();
  await expect(page.getByText('Olive oil')).toBeVisible();
  await page.locator('[data-testid^="stock-inc-"]').first().click();
  await page.getByTestId('inventory-tabs-shopping').click();
  await expect(page.getByTestId('shopping-cart')).toBeVisible();

  await page.getByTestId('nav-grocery').click();
  await page.getByTestId('nav-home').click();

  await page.getByTestId('backup-button').click();
  await page.getByTestId('backup-modal-close').click();

  expect(problems).toEqual([]);
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
