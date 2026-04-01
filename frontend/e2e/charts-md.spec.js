const { test, expect } = require('@playwright/test');

/** Seeded by backend/scripts/e2e_seed.py (Playwright webServer runs it before uvicorn). */
const MD_USER = {
  email: 'md.e2e@crm.local',
  password: 'Passw0rd!',
  dashboard: '/md/dashboard',
};

const SALES_USER = {
  email: 'sales.e2e@crm.local',
  password: 'Passw0rd!',
  dashboard: '/sales/dashboard',
};

test.use({ viewport: { width: 1440, height: 900 } });

async function loginMd(page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(MD_USER.email);
    await page.getByLabel('Password').fill(MD_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    try {
      await expect(page).toHaveURL(new RegExp(`${MD_USER.dashboard.replace('/', '\\/')}`), { timeout: 15000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

async function loginSales(page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(SALES_USER.email);
    await page.getByLabel('Password').fill(SALES_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    try {
      await expect(page).toHaveURL(new RegExp(`${SALES_USER.dashboard.replace('/', '\\/')}`), { timeout: 15000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

test.describe('Charts (Recharts)', () => {
  test('MD dashboard renders chart SVGs', async ({ page }) => {
    await loginMd(page);
    const dashResp = page.waitForResponse(
      (r) => r.url().includes('/api/md/dashboard') && r.request().method() === 'GET'
    );
    await page.goto('/md/dashboard', { waitUntil: 'load' });
    const resp = await dashResp;
    expect(resp.status(), `MD dashboard API status ${resp.status()}`).toBe(200);
    await expect(page.getByRole('heading', { name: /Executive Cockpit/i })).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 60000 });
    expect(await page.locator('.recharts-surface').count()).toBeGreaterThanOrEqual(1);
  });

  test('MD sales page renders chart SVGs', async ({ page }) => {
    await loginMd(page);
    const salesResp = page.waitForResponse(
      (r) => r.url().includes('/api/md/sales') && r.request().method() === 'GET'
    );
    await page.goto('/md/sales', { waitUntil: 'load' });
    const resp = await salesResp;
    expect(resp.status(), `MD sales API status ${resp.status()}`).toBe(200);
    await expect(page.getByRole('heading', { name: /Sales Attribution Matrix/i })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 60000 });
    expect(await page.locator('.recharts-surface').count()).toBeGreaterThanOrEqual(1);
  });

  test('Sales reports page renders chart SVGs', async ({ page }) => {
    await loginSales(page);
    const dashResp = page.waitForResponse(
      (r) => r.url().includes('/api/leads/dashboard') && r.request().method() === 'GET'
    );
    await page.goto('/sales/reports', { waitUntil: 'load' });
    const resp = await dashResp;
    expect(resp.status(), `Sales dashboard API status ${resp.status()}`).toBe(200);
    await expect(page.getByRole('heading', { name: /Reports & Analytics/i })).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.recharts-surface').first()).toBeVisible({ timeout: 60000 });
    expect(await page.locator('.recharts-surface').count()).toBeGreaterThanOrEqual(1);
  });
});
