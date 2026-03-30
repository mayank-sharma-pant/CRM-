const { test, expect } = require('@playwright/test');

const USERS = {
  purchase: { email: 'purchase.e2e@crm.local', password: 'Passw0rd!', dashboard: '/purchase/dashboard', heading: 'Purchase Cockpit' },
  sales: { email: 'sales.e2e@crm.local', password: 'Passw0rd!', dashboard: '/sales/dashboard', heading: 'Sales Dashboard' },
  manager: { email: 'manager.e2e@crm.local', password: 'Passw0rd!', dashboard: '/manager/dashboard', heading: 'Team Dashboard' },
  md: { email: 'md.e2e@crm.local', password: 'Passw0rd!', dashboard: '/md/dashboard', heading: 'Executive Cockpit' },
};

async function login(page, user) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(user.dashboard.replace('/', '\\/')), { timeout: 20000 });
}

test.describe('Frontend smoke (seeded E2E users)', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  test('bad password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('sales.e2e@crm.local');
    await page.getByLabel('Password').fill('wrong-password-xyz');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/incorrect email or password|login failed/i)).toBeVisible({ timeout: 10000 });
  });

  for (const [role, user] of Object.entries(USERS)) {
    test(`${role}: dashboard heading and no load error`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await login(page, user);
      await expect(page.getByRole('heading', { name: user.heading })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);

      expect(errors, `page errors: ${errors.join('; ')}`).toEqual([]);
    });
  }

  test('sales: clients page loads', async ({ page }) => {
    await login(page, USERS.sales);
    await page.goto('/sales/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await expect(page.getByText(/displaying \d+ client|no clients found/i)).toBeVisible({ timeout: 15000 });
  });

  test('md: revenue page loads', async ({ page }) => {
    await login(page, USERS.md);
    await page.goto('/md/revenue');
    await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('ReferenceError', { timeout: 15000 });
  });

  test('manager: leads list loads', async ({ page }) => {
    await login(page, USERS.manager);
    await page.goto('/manager/leads');
    await expect(page.getByRole('heading', { name: 'Leads Pipeline' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);
  });

  test('sales: leads registry loads', async ({ page }) => {
    await login(page, USERS.sales);
    await page.goto('/sales/leads');
    await expect(page.getByRole('heading', { name: 'Leads Registry' })).toBeVisible({ timeout: 15000 });
  });

  test('md: teams overview loads', async ({ page }) => {
    await login(page, USERS.md);
    await page.goto('/md/teams');
    await expect(page.getByRole('heading', { name: 'Teams Overview' })).toBeVisible({ timeout: 15000 });
  });

  test('manager: team tasks loads', async ({ page }) => {
    await login(page, USERS.manager);
    await page.goto('/manager/tasks');
    await expect(page.getByRole('heading', { name: 'Team Tasks' })).toBeVisible({ timeout: 15000 });
  });
});
