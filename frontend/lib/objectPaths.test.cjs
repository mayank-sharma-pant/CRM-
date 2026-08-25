const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  leadsHomePath,
  clientsHomePath,
  dealsHomePath,
  invoicesHomePath,
  accountsHomePath,
} = require("./objectPaths.cjs");

test("leads stay on the role prefix except purchase/admin", () => {
  assert.equal(leadsHomePath("/sales/leads/1"), "/sales/leads");
  assert.equal(leadsHomePath("/manager/dashboard"), "/manager/leads");
  assert.equal(leadsHomePath("/md/clients/9"), "/md/leads");
  assert.equal(leadsHomePath("/purchase/invoices"), "/sales/leads");
  assert.equal(leadsHomePath("/admin/users"), "/sales/leads");
});

test("clients stay on the role prefix except purchase/admin", () => {
  assert.equal(clientsHomePath("/sales/x"), "/sales/clients");
  assert.equal(clientsHomePath("/manager/clients"), "/manager/clients");
  assert.equal(clientsHomePath("/md/clients/1"), "/md/clients");
});

test("deals use sales/manager/md prefixes", () => {
  assert.equal(dealsHomePath("/sales/deals"), "/sales/deals");
  assert.equal(dealsHomePath("/manager/leads"), "/manager/deals");
  assert.equal(dealsHomePath("/md/dashboard"), "/md/deals");
  assert.equal(dealsHomePath("/purchase/stock"), "/sales/deals");
});

test("invoices keep purchase and md lists", () => {
  assert.equal(invoicesHomePath("/sales/clients/1"), "/sales/invoices");
  assert.equal(invoicesHomePath("/manager/clients/1"), "/manager/invoices");
  assert.equal(invoicesHomePath("/md/clients/1"), "/md/invoices");
  assert.equal(invoicesHomePath("/purchase/invoices/3"), "/purchase/invoices");
});

test("accounts stay on the role prefix except purchase/admin", () => {
  assert.equal(accountsHomePath("/sales/clients"), "/sales/accounts");
  assert.equal(accountsHomePath("/manager/dashboard"), "/manager/accounts");
  assert.equal(accountsHomePath("/md/clients/1"), "/md/accounts");
  assert.equal(accountsHomePath("/purchase/stock"), "/sales/accounts");
});
