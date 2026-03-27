const { test, expect } = require('@playwright/test');

const USERS = {
  purchase: { email: 'purchase.e2e@crm.local', password: 'Passw0rd!', dashboard: '/purchase/dashboard' },
  sales: { email: 'sales.e2e@crm.local', password: 'Passw0rd!', dashboard: '/sales/dashboard' },
  manager: { email: 'manager.e2e@crm.local', password: 'Passw0rd!', dashboard: '/manager/dashboard' },
  md: { email: 'md.e2e@crm.local', password: 'Passw0rd!', dashboard: '/md/dashboard' },
};

async function login(page, user) {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    try {
      await expect(page).toHaveURL(new RegExp(`${user.dashboard.replace('/', '\\/')}`), { timeout: 15000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

async function openRoleSession(browser, role) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, USERS[role]);
  return { context, page };
}

test('purchase add stock, sales order decrements, manager and md can see update', async ({ browser }) => {
  const soldQty = 3;
  const startingQty = 12;
  const expectedQty = startingQty - soldQty;
  const runId = Date.now().toString().slice(-6);
  const sku = `E2E-RAM-${runId}`;
  const itemName = `E2E RAM ${runId}`;

  const purchaseSession = await openRoleSession(browser, 'purchase');
  const purchasePage = purchaseSession.page;
  await purchasePage.goto('/purchase/stock');
  await purchasePage.getByRole('textbox', { name: 'Name', exact: true }).fill(itemName);
  await purchasePage.getByRole('textbox', { name: 'SKU', exact: true }).fill(sku);
  await purchasePage.getByRole('textbox', { name: 'Category', exact: true }).fill('Hardware');
  await purchasePage.getByPlaceholder('Price').fill('100');
  await purchasePage.getByPlaceholder('Qty').fill(String(startingQty));
  await purchasePage.getByPlaceholder('Reorder').fill('2');
  await purchasePage.getByRole('button', { name: 'Add' }).click();

  const purchaseRow = purchasePage.locator('tr', { hasText: sku });
  await expect(purchaseRow).toBeVisible();
  await expect(purchaseRow).toContainText(`${startingQty} pcs`);
  await purchaseSession.context.close();

  const salesSession = await openRoleSession(browser, 'sales');
  const salesPage = salesSession.page;
  await salesPage.goto('/sales/orders');
  await salesPage.getByRole('button', { name: 'Create Order' }).click();
  await expect(salesPage.getByText('Create Sales Order')).toBeVisible();

  const selects = salesPage.locator('select');
  await selects.nth(0).selectOption({ label: 'E2E Client' });
  const stockSelect = selects.nth(1);
  const skuOption = stockSelect.locator(`option:has-text("${sku}")`);
  await expect(skuOption).toHaveCount(1);
  const stockValue = await skuOption.getAttribute('value');
  expect(stockValue).toBeTruthy();
  await stockSelect.selectOption(stockValue);

  await salesPage.getByPlaceholder('Qty').first().fill(String(soldQty));
  await salesPage.getByRole('button', { name: 'Initiate Approval' }).click();
  await expect(salesPage.getByText('Create Sales Order')).toBeHidden();
  await salesSession.context.close();

  const managerSession = await openRoleSession(browser, 'manager');
  const managerPage = managerSession.page;
  await managerPage.goto('/manager/stock');
  await managerPage.getByPlaceholder('Search by name / SKU / category').fill(sku);
  const managerRow = managerPage.locator('tr', { hasText: sku });
  await expect(managerRow).toBeVisible();
  await expect(managerRow).toContainText(`${expectedQty} pcs`);
  await managerSession.context.close();

  const mdSession = await openRoleSession(browser, 'md');
  const mdPage = mdSession.page;
  await mdPage.goto('/md/stock');
  await mdPage.getByPlaceholder('Search by name / SKU / category').fill(sku);
  const mdRow = mdPage.locator('tr', { hasText: sku });
  await expect(mdRow).toBeVisible();
  await expect(mdRow).toContainText(`${expectedQty} pcs`);
  await mdSession.context.close();
});

test('only purchase sees inventory management controls', async ({ browser }) => {
  const purchaseSession = await openRoleSession(browser, 'purchase');
  await purchaseSession.page.goto('/purchase/stock');
  await expect(purchaseSession.page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await purchaseSession.context.close();

  const salesSession = await openRoleSession(browser, 'sales');
  await salesSession.page.goto('/sales/stock');
  await expect(salesSession.page.getByRole('textbox', { name: 'Name', exact: true })).toHaveCount(0);
  await salesSession.context.close();

  const managerSession = await openRoleSession(browser, 'manager');
  await managerSession.page.goto('/manager/stock');
  await expect(managerSession.page.getByRole('textbox', { name: 'Name', exact: true })).toHaveCount(0);
  await managerSession.context.close();
});
