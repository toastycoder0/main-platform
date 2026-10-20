import type { ProductCrumbDTO } from './product-details.types';

export const PRODUCTS_PATH = '/products';

export function buildCategoryCrumbs(chain: { slug: string; name: string }[]): ProductCrumbDTO[] {
  const slugs: string[] = [];

  return chain.map(({ slug, name }) => {
    slugs.push(slug);
    return { name, href: `${PRODUCTS_PATH}/${slugs.join('/')}` };
  });
}

/** Orders the ancestors named by a materialized `a/b/c` path; incomplete chains yield nothing. */
export function orderByPath<T extends { id: string }>(path: string, rows: T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = path
    .split('/')
    .map((id) => byId.get(id))
    .filter((row): row is T => row !== undefined);

  return ordered.length === path.split('/').length ? ordered : [];
}
