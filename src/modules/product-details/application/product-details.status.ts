/** Statuses whose detail page is reachable by URL; `unlisted` is hidden from listings only. */
export const DETAIL_STATUSES = ['active', 'unlisted'] as const;

/** Statuses that may be advertised from another product's page with a link. */
export const LISTED_STATUSES = ['active'] as const;

export function isUnlisted(status: string): boolean {
  return status === 'unlisted';
}
