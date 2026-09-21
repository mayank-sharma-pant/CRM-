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
  test('forced 2FA setup page is reachable without a session', async ({ page }) => {
    await page.goto('/settings/security?setup_token=pending-setup&forced=1');
    await expect(page).toHaveURL(/\/settings\/security/);
    await expect(page.getByText(/your company requires two-factor authentication/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enable 2FA' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
  });

  for (const role of ['sales', 'manager', 'md']) {
    test(`${role}: unassigned pool loads`, async ({ page }) => {
      await login(page, USERS[role]);
      await page.goto(`/${role}/leads/unassigned`);
      await expect(page.getByRole('heading', { name: 'Unassigned Pool' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/unable to load|please retry|could not load the pool/i)).toHaveCount(0);
    });
  }

  for (const role of ['sales', 'manager', 'md']) {
    test(`${role}: appointments page loads`, async ({ page }) => {
      await login(page, USERS[role]);
      await page.goto(`/${role}/appointments`);
      await expect(page.getByRole('heading', { name: 'Appointments' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/unable to load|please retry|could not load appointments/i)).toHaveCount(0);
    });
  }

  for (const role of ['sales', 'manager', 'md']) {
    test(`${role}: conversations page loads`, async ({ page }) => {
      await login(page, USERS[role]);
      await page.goto(`/${role}/conversations`);
      await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/unable to load|please retry|could not load conversations/i)).toHaveCount(0);
    });
  }

  test('purchase: unassigned pool, appointments, and conversations are not in nav', async ({ page }) => {
    await login(page, USERS.purchase);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: 'Unassigned Pool' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Appointments' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Conversations' })).toHaveCount(0);
  });

  test('sales: unassigned pool is in nav', async ({ page }) => {
    await login(page, USERS.sales);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: 'Unassigned Pool' })).toBeVisible();
  });

  test('md: teams overview loads', async ({ page }) => {
    await login(page, USERS.md);
    await page.goto('/md/teams');
    await expect(page.getByRole('heading', { name: 'Teams Overview' })).toBeVisible({ timeout: 15000 });
  });

  test('manager: team tasks loads', async ({ page }) => {
    await login(page, USERS.manager);
    await page.goto('/manager/tasks');
    await expect(page.getByRole('heading', { name: 'Team tasks' })).toBeVisible({ timeout: 15000 });
  });
});
