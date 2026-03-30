/**
 * Hits your *already running* Next + API (default http://127.0.0.1:3000).
 *
 *   PW_USE_EXTERNAL=1 \
 *   PW_LOGIN_EMAIL=you@company.com \
 *   PW_LOGIN_PASSWORD=secret \
 *   npx playwright test --project=local-chromium
 *
 * Optional: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
 */
const { test, expect } = require('@playwright/test');

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 25000 });
}

test.describe('Local dev stack (external servers)', () => {
  test.beforeEach(() => {
    test.skip(
      process.env.PW_USE_EXTERNAL !== '1',
      'Set PW_USE_EXTERNAL=1 and keep Next (and API proxy) running on PLAYWRIGHT_BASE_URL'
    );
    test.skip(
      !process.env.PW_LOGIN_EMAIL || !process.env.PW_LOGIN_PASSWORD,
      'Set PW_LOGIN_EMAIL and PW_LOGIN_PASSWORD'
    );
  });

  test('login redirects and dashboard has no hard error banner', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await login(page, process.env.PW_LOGIN_EMAIL, process.env.PW_LOGIN_PASSWORD);

    const url = page.url();
    expect(url).not.toMatch(/\/login$/);
    await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);

    // Role-specific extra navigation (pathname after origin)
    const path = new URL(url).pathname;

    if (path.startsWith('/md/')) {
      await page.goto('/md/teams');
      await expect(page.getByRole('heading', { name: 'Teams Overview' })).toBeVisible({ timeout: 20000 });
      await page.goto('/md/revenue');
      await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);
    } else if (path.startsWith('/sales/')) {
      await page.goto('/sales/leads');
      await expect(page.getByRole('heading', { name: 'Leads Registry' })).toBeVisible({ timeout: 20000 });
      await page.goto('/sales/tasks');
      await expect(page.getByRole('heading', { name: 'Task Control Plane' })).toBeVisible({ timeout: 20000 });
    } else if (path.startsWith('/manager/')) {
      await page.goto('/manager/tasks');
      await expect(page.getByRole('heading', { name: 'Team Tasks' })).toBeVisible({ timeout: 20000 });
    } else if (path.startsWith('/purchase/')) {
      await page.goto('/purchase/stock');
      await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);
    }

    expect(errors, `page errors: ${errors.join('; ')}`).toEqual([]);
  });
});
