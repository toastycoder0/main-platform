import { type Column, ilike, or, type SQL, type SQLWrapper } from 'drizzle-orm';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function searchILike(columns: (Column | SQLWrapper)[], term: string): SQL | undefined {
  if (columns.length === 0) {
    return undefined;
  }

  const pattern = `%${escapeLike(term)}%`;

  return or(...columns.map((column) => ilike(column, pattern)));
}
