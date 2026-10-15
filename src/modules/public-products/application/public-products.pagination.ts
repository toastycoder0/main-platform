export type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

const MAX_VISIBLE_PAGES = 7;

export function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    items.push('ellipsis-start');
  }

  for (let current = start; current <= end; current++) {
    items.push(current);
  }

  if (end < totalPages - 1) {
    items.push('ellipsis-end');
  }

  items.push(totalPages);

  return items;
}
