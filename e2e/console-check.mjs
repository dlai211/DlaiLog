// Diagnostic helper: drives the app in a real browser and prints every console
// message, so dev-only warnings/errors can be reproduced and fixed.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:8081/';

const browser = await chromium.launch();
const page = await browser.newPage();

const messages = [];
page.on('console', (message) => {
  const type = message.type();
  if (type === 'error' || type === 'warning') {
    const text = message.text();
    messages.push(`[${type}] ${text === '' ? '(empty message)' : text}`);
  }
});
page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message || '(empty)'}`));

async function step(name, fn) {
  try {
    await fn();
    await page.waitForTimeout(500);
  } catch (error) {
    messages.push(`[step-failed] ${name}: ${error.message.split('\n')[0]}`);
  }
}

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// A project card: create one, then interact with its pressables and actions.
await step('open projects', () => page.getByTestId('nav-projects').first().click());
await step('new project', () => page.getByTestId('new-project').first().click());
await step('name it', () => page.getByTestId('project-name').fill('Repro project'));
await step('save it', () => page.getByTestId('project-save').click());
await step('hover the card row actions', async () => {
  await page.getByTestId('project-edit-').first().hover({ timeout: 2000 }).catch(() => {});
  const cards = page.locator('[data-testid^="project-card-"]');
  await cards.first().hover();
});
await step('press the edit action', async () => {
  const editButtons = page.locator('[data-testid^="project-edit-"]');
  await editButtons.first().click();
});
await step('close the editor', () => page.getByTestId('project-cancel').click());
await step('press the delete action', async () => {
  const deleteButtons = page.locator('[data-testid^="project-delete-"]');
  await deleteButtons.first().click();
});
await step('cancel the confirm', () => page.getByTestId('confirm-dialog-cancel').click());

// The spending form: emoji picker + selects inside a modal.
await step('open spending', () => page.getByTestId('nav-spending').first().click());
await step('new purchase', () => page.getByTestId('new-purchase').first().click());
await step('type a name', () => page.getByTestId('purchase-name').fill('Soy'));
await step('open the unit picker', () => page.getByTestId('purchase-unit').click());
await step('pick a unit', () => page.getByTestId('purchase-unit-option-L').click());
await step('cancel the purchase form', () => page.getByTestId('purchase-cancel').click());

// The To-do month view: a day cell (button) holding task chips (buttons).
await step('open todo', () => page.getByTestId('nav-todo').first().click());
await step('new task', () => page.getByTestId('new-task').first().click());
await step('name the task', () => page.getByTestId('task-title-input').fill('Repro task'));
await step('save the task', () => page.getByTestId('task-save').click());
await step('switch to month view', () => page.getByTestId('todo-view-month').click());
await step('open a day from the month grid', async () => {
  const days = page.locator('[data-testid^="todo-month-grid-day-"]');
  await days.first().click();
});
await step('open a task chip in month view', async () => {
  await page.getByTestId('todo-view-month').click();
  const chips = page.locator('[data-testid^="month-task-"]');
  if (await chips.count()) await chips.first().click({ timeout: 2000 });
  await page.getByTestId('task-cancel').click({ timeout: 2000 });
});

// The shell's own pressables.
await step('open backup', () => page.getByTestId('backup-button').first().click());
await step('close backup', () => page.getByTestId('backup-modal-close').click());

await page.waitForTimeout(1500);
console.log(messages.length ? messages.join('\n---\n') : '(no console errors or warnings)');
await browser.close();
