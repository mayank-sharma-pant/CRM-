/** Role-prefixed object URLs. Same screens; API row scope already differs by role. */
export function leadsHomePath(pathname = '') {
  if (pathname.startsWith('/md')) return '/md/leads';
  if (pathname.startsWith('/manager')) return '/manager/leads';
  return '/sales/leads';
}

export function clientsHomePath(pathname = '') {
  if (pathname.startsWith('/md')) return '/md/clients';
  if (pathname.startsWith('/manager')) return '/manager/clients';
  return '/sales/clients';
}
