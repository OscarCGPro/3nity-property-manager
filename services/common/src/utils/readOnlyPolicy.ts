/** Application readers can inspect rental records, never configuration or writes. */
export function isReadOnlyRequestAllowed(
  method: string,
  path: string
): boolean {
  return (
    method === 'GET' &&
    (/^\/(properties|tenants|leases|rents|dashboard)(\/|$)/.test(path) ||
      /^\/portfolio\/?$/.test(path))
  );
}
