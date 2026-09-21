const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  leadsHomePath,
  unassignedLeadsPath,
  appointmentsHomePath,
  conversationsHomePath,
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

test("unassigned pool stays on the role prefix except purchase/admin", () => {
  assert.equal(unassignedLeadsPath("/sales/leads"), "/sales/leads/unassigned");
  assert.equal(unassignedLeadsPath("/manager/dashboard"), "/manager/leads/unassigned");
  assert.equal(unassignedLeadsPath("/md/clients/9"), "/md/leads/unassigned");
  assert.equal(unassignedLeadsPath("/purchase/invoices"), "/sales/leads/unassigned");
  assert.equal(unassignedLeadsPath("/admin/users"), "/sales/leads/unassigned");
});

test("appointments stay on the role prefix except purchase/admin", () => {
  assert.equal(appointmentsHomePath("/sales/leads"), "/sales/appointments");
  assert.equal(appointmentsHomePath("/manager/dashboard"), "/manager/appointments");
  assert.equal(appointmentsHomePath("/md/clients/9"), "/md/appointments");
  assert.equal(appointmentsHomePath("/purchase/invoices"), "/sales/appointments");
  assert.equal(appointmentsHomePath("/admin/users"), "/sales/appointments");
});

test("conversations stay on the role prefix except purchase/admin", () => {
  assert.equal(conversationsHomePath("/sales/leads"), "/sales/conversations");
  assert.equal(conversationsHomePath("/manager/dashboard"), "/manager/conversations");
  assert.equal(conversationsHomePath("/md/clients/9"), "/md/conversations");
  assert.equal(conversationsHomePath("/purchase/invoices"), "/sales/conversations");
  assert.equal(conversationsHomePath("/admin/users"), "/sales/conversations");
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
