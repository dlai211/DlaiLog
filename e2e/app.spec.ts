import { expect, test } from '@playwright/test';

/**
 * The acceptance criteria from PRD §10 that need a real browser: the app
 * loads, everything persists across a refresh, the layout follows the window
 * width, and a backup really downloads.
 */

/**
 * The app fills a brand-new install with the example dataset (see
 * src/store/sample-data.ts). These tests want a store of their own making, so
 * they switch that off before the app loads — one key in local storage, set
 * before any script runs.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dlailog:no-seed', '1');
  });
});

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

test('a brand-new install opens with the example data', async ({ page }) => {
  // Undo the opt-out the other tests set: a first visit has an empty browser.
  await page.addInitScript(() => {
    window.localStorage.removeItem('dlailog:no-seed');
  });
  await page.goto('/');

  await expect(page.getByTestId('home-stats')).toBeVisible();
  await expect(page.getByTestId('home-stat-spending')).not.toContainText('$0.00');

  // The calendar has the repeating class, and the pantry has its pictures.
  await page.getByTestId('nav-todo').click();
  await expect(page.getByTestId('week-strip')).toBeVisible();
  await page.getByTestId('nav-inventory').click();
  await expect(page.getByTestId('inventory-tabs')).toBeVisible();
  await expect(page.getByText('Soy sauce').first()).toBeVisible();
  await expect(page.getByText('Out of stock').first()).toBeVisible();

  // And the Appearance switch really changes the palette (the sidebar is a
  // large, always-present surface, so it is the honest thing to measure).
  const background = () =>
    page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="app-shell-sidebar"]');
      return sidebar ? getComputedStyle(sidebar).backgroundColor : '';
    });
  await page.getByTestId('theme-option-dark').click();
  await expect
    .poll(async () => background())
    .toBe('rgb(46, 51, 47)');
  await page.getByTestId('theme-option-light').click();
  await expect
    .poll(async () => background())
    .toBe('rgb(214, 218, 200)');

  // The choice is remembered across a reload.
  await page.getByTestId('theme-option-dark').click();
  await page.reload();
  await expect
    .poll(async () => background())
    .toBe('rgb(46, 51, 47)');
});

test('the sidebar compacts to a rail, and opens again when hovered', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell-sidebar')).toBeVisible();

  const sidebarWidth = () =>
    page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="app-shell-sidebar"]');
      return sidebar ? sidebar.getBoundingClientRect().width : 0;
    });

  const openWidth = await sidebarWidth();

  await page.getByTestId('sidebar-toggle').click();
  // Move the pointer off the sidebar: hovering keeps it open on purpose.
  await page.mouse.move(900, 500);
  await expect
    .poll(async () => sidebarWidth(), { timeout: 5000 })
    .toBeLessThan(openWidth - 60);

  // Hovering the rail opens it again for as long as the pointer is on it.
  await page.getByTestId('app-shell-sidebar').hover();
  await expect.poll(async () => sidebarWidth()).toBeGreaterThan(openWidth - 60);

  // Clicking the button pins it open, even with the pointer off it.
  await page.getByTestId('sidebar-toggle').click();
  await page.mouse.move(900, 500);
  await expect.poll(async () => sidebarWidth()).toBeGreaterThan(openWidth - 20);
});

/** The next `YYYY-MM-DD` that falls on a given weekday (0 = Sunday). */
function nextWeekday(target: number): { key: string; next: (days: number) => string } {
  const date = new Date();
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() !== target);

  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const next = (days: number) => {
    const other = new Date(date);
    other.setDate(other.getDate() + days);
    return `${other.getFullYear()}-${String(other.getMonth() + 1).padStart(2, '0')}-${String(
      other.getDate()
    ).padStart(2, '0')}`;
  };
  return { key, next };
}

test('a repeating task shows on every one of its days, and is ticked off one day at a time', async ({
  page,
}) => {
  const tuesday = nextWeekday(2);
  const thursday = tuesday.next(2);
  const wednesday = tuesday.next(1);

  await page.goto(`/todo?date=${tuesday.key}`);
  await page.getByTestId('new-task').click();
  await page.getByTestId('task-title-input').fill('Chinese class');
  await page.getByTestId('task-time-toggle').click();
  await page.getByTestId('task-end-add').click();

  await page.getByTestId('task-repeat-toggle').click();
  // The starting day is picked for you; add Thursday as the second day.
  await page.getByTestId('task-day-4').click();
  await expect(page.getByTestId('task-repeat-summary')).toContainText('Every Tue & Thu');
  await page.getByTestId('task-save').click();

  await expect(page.getByText('Chinese class')).toBeVisible();
  await expect(page.getByText('12:00 – 2:00 pm')).toBeVisible();
  await expect(page.getByText('Every Tue & Thu')).toBeVisible();

  // Ticking Tuesday off leaves Thursday waiting.
  const checkbox = page.locator('[data-testid^="task-check-"]').first();
  await checkbox.click();
  await expect(page.getByTestId('todo-done-toggle')).toBeVisible();

  await page.goto(`/todo?date=${thursday}`);
  await expect(page.getByText('Chinese class')).toBeVisible();
  await expect(page.getByTestId('todo-done-toggle')).toHaveCount(0);

  // Wednesday is not one of its days.
  await page.goto(`/todo?date=${wednesday}`);
  await expect(page.getByText('Nothing planned — enjoy it.')).toBeVisible();
});

test('logs a whole shopping trip at once, and every screen hears about it', async ({ page }) => {
  await page.goto('/spending');
  await page.getByTestId('new-trip').click();

  await page.getByTestId('trip-store').fill('Albertsons');
  await page.getByTestId('trip-item-name-0').fill('Ketchup');
  await page.getByTestId('trip-item-category-0').click();
  await page.getByTestId('trip-item-category-0-option-condiment').click();
  await page.getByTestId('trip-item-price-0').fill('3.99');

  await page.getByTestId('trip-item-name-1').fill('Apples');
  await page.getByTestId('trip-item-price-1').fill('4.99');
  await page.getByTestId('trip-item-savings-1').fill('1.50');

  // The footer adds the trip up while it is being typed.
  await expect(page.getByTestId('trip-summary-paid')).toContainText('8.98');
  await expect(page.getByTestId('trip-summary-savings')).toContainText('1.50');
  await expect(page.getByTestId('trip-save')).toContainText('2 items');

  await page.getByTestId('trip-save').click();

  // Both items are on the Spending list, with the saving shown.
  await expect(page.getByTestId('trip-form')).toHaveCount(0);
  await expect(page.getByText('Ketchup')).toBeVisible();
  await expect(page.getByText('Apples')).toBeVisible();
  await expect(page.locator('[data-testid^="purchase-savings-"]')).toContainText('saved $1.50');
  await expect(page.getByTestId('spending-summary')).toContainText('Saved $1.50');

  // The Grocery Tracker has the ketchup with its unit price…
  await page.getByTestId('nav-grocery').click();
  await expect(page.getByText('Ketchup').first()).toBeVisible();

  // …and the pantry is stocked from the same trip.
  await page.getByTestId('nav-inventory').click();
  await expect(page.getByText('Ketchup')).toBeVisible();
  await expect(page.getByText('Apples')).toBeVisible();
});

test('the Albertsons trip imports into an app that already has data, once', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('backup-button').click();
  await page.getByTestId('settings-import-trip').click();
  await expect(page.getByText('14 items added from Albertsons.')).toBeVisible();

  // The Grocery Tracker knows the receipt's items (the ketchup is a condiment,
  // which is the tab the tracker opens on)…
  await page.getByTestId('nav-grocery').click();
  await page.getByTestId('grocery-search').fill('Ketchup');
  await expect(page.getByText('Signature Select Ketchup Less Sodium Less Sugar')).toBeVisible();

  // …and the pantry was stocked from the same trip.
  await page.getByTestId('nav-inventory').click();
  const carrots = page.locator('[data-testid^="stock-row-"]', { hasText: 'Carrots' });
  await expect(carrots).toContainText('2 lb');

  // Pressing it again changes nothing.
  await page.getByTestId('backup-button').click();
  await page.getByTestId('settings-import-trip').click();
  await expect(page.getByText('The Albertsons trip is already logged.')).toBeVisible();

  await page.getByTestId('nav-inventory').click();
  await expect(page.locator('[data-testid^="stock-row-"]', { hasText: 'Carrots' })).toContainText(
    '2 lb'
  );
});

test('a suggestion can be dragged right across into the shopping cart', async ({ page }) => {
  await page.goto('/inventory');

  // Something the pantry has run out of, so there is a suggestion to drag.
  await page.getByTestId('new-inventory-item').click();
  await page.getByTestId('inventory-name').fill('Cooking oil');
  await page.getByTestId('inventory-quantity').fill('0');
  await page.getByTestId('inventory-save').click();
  await page.getByTestId('inventory-tabs-shopping').click();

  const grip = page.locator('[data-testid^="suggestion-grip-"]').first();
  const cart = page.getByTestId('shopping-cart');
  await expect(grip).toBeVisible();

  const borderBefore = await cart.evaluate((el) => getComputedStyle(el).borderColor);
  const from = await grip.boundingBox();
  const to = await cart.boundingBox();
  if (!from || !to) throw new Error('Could not measure the drag.');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Out of the card and across the gap to the cart, in one go.
  await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 20 });

  // The cart lights up while the pointer is over it…
  await expect
    .poll(async () => cart.evaluate((el) => getComputedStyle(el).borderColor))
    .not.toBe(borderBefore);

  await page.mouse.up();

  // …the drop lands, and the browser never took the gesture for a text selection.
  await expect(cart).toContainText('Cooking oil');
  expect(await page.evaluate(() => String(window.getSelection() ?? '').trim())).toBe('');
});
