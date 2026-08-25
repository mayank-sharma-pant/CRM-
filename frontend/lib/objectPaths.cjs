function rolePrefix(pathname = "") {
  const p = String(pathname || "");
  if (p.startsWith("/md")) return "/md";
  if (p.startsWith("/manager")) return "/manager";
  if (p.startsWith("/purchase")) return "/purchase";
  if (p.startsWith("/admin")) return "/admin";
  return "/sales";
}

function leadsHomePath(pathname = "") {
  const prefix = rolePrefix(pathname);
  if (prefix === "/purchase" || prefix === "/admin") return "/sales/leads";
  return `${prefix}/leads`;
}

function clientsHomePath(pathname = "") {
  const prefix = rolePrefix(pathname);
  if (prefix === "/purchase" || prefix === "/admin") return "/sales/clients";
  return `${prefix}/clients`;
}

function dealsHomePath(pathname = "") {
  const prefix = rolePrefix(pathname);
  if (prefix === "/purchase") return "/sales/deals";
  if (prefix === "/admin") return "/sales/deals";
  return `${prefix}/deals`;
}

function invoicesHomePath(pathname = "") {
  const prefix = rolePrefix(pathname);
  if (prefix === "/admin") return "/sales/invoices";
  if (prefix === "/sales") return "/sales/invoices";
  return `${prefix}/invoices`;
}

function accountsHomePath(pathname = "") {
  const prefix = rolePrefix(pathname);
  if (prefix === "/purchase" || prefix === "/admin") return "/sales/accounts";
  return `${prefix}/accounts`;
}

module.exports = {
  rolePrefix,
  leadsHomePath,
  clientsHomePath,
  dealsHomePath,
  invoicesHomePath,
  accountsHomePath,
};
