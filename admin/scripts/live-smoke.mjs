// Live browser smoke against http://localhost:3003 + http://localhost:3000.
// Seeds a real session cookie (passed in), walks every admin route,
// captures console errors + failed requests + screenshots.
// Usage:
//   SESSION=<cg_session uuid> PROJECT_ID=<uuid> node admin/scripts/live-smoke.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SESSION = process.env.SESSION ?? '';
const PROJECT_ID = process.env.PROJECT_ID ?? '';
const BASE = 'http://localhost:3003';
const OUT = 'admin/scripts/smoke-output';
mkdirSync(OUT, { recursive: true });

const routes = [
  { name: '01-dashboard', path: '/' },
  { name: '02-projects-new', path: '/projects/new' },
  { name: '03-project-overview', path: `/projects/${PROJECT_ID}` },
  { name: '04-members', path: `/projects/${PROJECT_ID}/members` },
  { name: '05-tokens', path: `/projects/${PROJECT_ID}/tokens` },
  { name: '06-items', path: `/projects/${PROJECT_ID}/items` },
  { name: '07-audit', path: `/projects/${PROJECT_ID}/audit` },
  { name: '08-stats', path: `/projects/${PROJECT_ID}/stats` },
  { name: '09-settings', path: '/settings' },
];

const summary = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 1440, height: 900 },
});
await ctx.addCookies([
  {
    name: 'cg_session',
    value: SESSION,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  },
]);

for (const r of routes) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const requestFailures = [];
  const responses = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) =>
    requestFailures.push(`${req.method()} ${req.url()} → ${req.failure()?.errorText}`),
  );
  page.on('response', (resp) => {
    const s = resp.status();
    if (s >= 400) {
      responses.push({ status: s, url: resp.url(), method: resp.request().method() });
    }
  });

  let loadError = null;
  try {
    await page.goto(r.path, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500); // let client effects settle
  } catch (err) {
    loadError = err.message;
  }

  const title = await page.title().catch(() => '');
  const screenshotPath = join(OUT, `${r.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  summary.push({
    route: r.path,
    name: r.name,
    title,
    loadError,
    consoleErrors,
    requestFailures,
    errorResponses: responses,
    screenshot: screenshotPath,
  });

  await page.close();
}

await browser.close();
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    {
      routes: summary.length,
      routesWithErrors: summary.filter(
        (s) => s.loadError || s.consoleErrors.length || s.requestFailures.length || s.errorResponses.length,
      ).length,
      summaryPath: join(OUT, 'summary.json'),
    },
    null,
    2,
  ),
);
