// Diagnostic helper: prints the DOM element react-native-web produced for a
// given testID, to confirm which elements are real <button>s.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:8081/';
const testIdPrefix = process.argv[3] ?? 'project-card-';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text().split('\n')[0]);
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.getByTestId('nav-projects').first().click();
await page.waitForTimeout(400);
await page.getByTestId('new-project').first().click();
await page.getByTestId('project-name').fill('Tag check');
await page.getByTestId('project-save').click();
await page.waitForTimeout(600);

const info = await page.locator(`[data-testid^="${testIdPrefix}"]`).first().evaluate((element) => ({
  tag: element.tagName,
  role: element.getAttribute('role'),
  tabIndex: element.getAttribute('tabindex'),
}));

console.log(JSON.stringify(info, null, 2));
console.log('errors:', errors.length ? errors.join(' | ') : '(none)');
await browser.close();
