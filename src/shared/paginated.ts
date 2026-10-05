/** Page of items every server-first list query resolves to. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
