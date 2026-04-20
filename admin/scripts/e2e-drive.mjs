// E2E driver — uses existing cg_session cookie from Redis
// to create project + invite + token, then curl /mcp with plaintext.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const SESSION = '95704054-1d12-4d1a-843b-8f942e34e154';
const BASE = 'http://localhost:3003';
const OUT = '/tmp/e2e-out';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

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

const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[console:${m.type()}] ${m.text()}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', async (r) => {
  if (r.status() >= 400) logs.push(`[resp ${r.status()}] ${r.url()}`);
});

// STEP 1: dashboard
await page.goto('/');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${OUT}/01-dashboard.png` });
console.log('OK dashboard URL:', page.url());

// STEP 2: new project
await page.goto('/projects/new');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${OUT}/02-new-project.png` });

// Fill name field + submit
const projectName = `e2e-${Date.now()}`;
const nameInput = page.locator('input[placeholder="My project"], input[type="text"]').first();
await nameInput.fill(projectName);
const submit = page.getByRole('button', { name: /create project/i }).first();
await submit.click();
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${OUT}/03-after-create.png` });

const curUrl = page.url();
console.log('OK post-create URL:', curUrl);
const m = curUrl.match(/projects\/([0-9a-f-]{36})/);
const projectId = m ? m[1] : null;
console.log('PROJECT_ID=', projectId);

// STEP 3: members page — invite a user
if (projectId) {
  await page.goto(`/projects/${projectId}/members`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/04-members.png` });

  const inviteBtn = page.locator('button:has-text("Invite"), a:has-text("Invite")').first();
  if (await inviteBtn.count()) {
    await inviteBtn.click();
    await page.waitForTimeout(500);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.count()) {
      await emailInput.fill('e2e-test@cleargate.local');
    }
    const createInviteBtn = page.locator('button:has-text("Create"), button:has-text("Invite"), button[type="submit"]').last();
    await createInviteBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/05-invite-modal.png` });
    // Grab invite URL from the input element's value
    const inviteInput = page.locator('input[readonly], input[type="text"]').last();
    let inviteUrl = null;
    if (await inviteInput.count()) {
      inviteUrl = await inviteInput.inputValue();
    }
    console.log('INVITE_URL=', inviteUrl);
    writeFileSync(`${OUT}/invite-url.txt`, inviteUrl || 'NOT_FOUND');
  }

  // STEP 4: tokens page — issue plaintext
  await page.goto(`/projects/${projectId}/tokens`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/06-tokens.png` });

  const newTokenBtn = page.locator('button:has-text("Issue"), button:has-text("New"), button:has-text("Create")').first();
  if (await newTokenBtn.count()) {
    await newTokenBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/07-token-modal.png` });

    // May need to pick a member first OR may show plaintext directly
    const memberSelect = page.locator('select[name*="member" i], select').first();
    if (await memberSelect.count()) {
      const opts = await memberSelect.locator('option').allTextContents();
      console.log('member options:', opts);
      if (opts.length > 1) {
        // Pick first non-placeholder option
        await memberSelect.selectOption({ index: 1 });
      }
    }
    const tokenNameInput = page.locator('input[placeholder*="ci-bot" i], input[placeholder*="ci-" i]').first();
    await tokenNameInput.fill('e2e-ci-token');
    const submitToken = page.getByRole('button', { name: /^issue token$/i }).last();
    await submitToken.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/08-token-plaintext.png` });
    // Plaintext shown in a readonly input or code block
    const plainInput = page.locator('input[readonly], code, pre').last();
    let plaintext = null;
    if (await plainInput.count()) {
      const v = await plainInput.inputValue().catch(() => null);
      plaintext = v ?? (await plainInput.innerText().catch(() => null));
    }
    if (!plaintext) {
      const bodyText = await page.locator('body').innerText();
      const m2 = bodyText.match(/[A-Za-z0-9_-]{40,}/g);
      plaintext = m2 ? m2[m2.length - 1] : null;
    }
    console.log('PLAINTEXT_TOKEN=', plaintext);
    writeFileSync(`${OUT}/plaintext.txt`, plaintext || 'NOT_FOUND');
  }
}

writeFileSync(`${OUT}/logs.txt`, logs.join('\n'));
await browser.close();
console.log('DONE. See', OUT);
