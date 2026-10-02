export function findSiteById<T extends { id: string }>(
  sites: T[] | undefined,
  id: string,
): T | null {
  if (!sites?.length || !id) {
    return null;
  }

  return sites.find((site) => site.id === id) ?? null;
}
