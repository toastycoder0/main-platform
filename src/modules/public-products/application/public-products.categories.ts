import type {
  PublicCategoryCrumb,
  PublicCategoryNode,
  PublicCategoryRow,
} from './public-products.types';

export const PRODUCTS_PATH = '/products';

export function categoryHref(slugs: string[]): string {
  return slugs.length > 0 ? `${PRODUCTS_PATH}/${slugs.join('/')}` : PRODUCTS_PATH;
}

function compareRows(a: PublicCategoryRow, b: PublicCategoryRow): number {
  return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
}

function groupByParent(rows: PublicCategoryRow[]): Map<string | null, PublicCategoryRow[]> {
  const grouped = new Map<string | null, PublicCategoryRow[]>();

  for (const row of rows) {
    const siblings = grouped.get(row.parentId) ?? [];
    siblings.push(row);
    grouped.set(row.parentId, siblings);
  }

  for (const siblings of grouped.values()) {
    siblings.sort(compareRows);
  }

  return grouped;
}

export function resolveCategoryChain(
  rows: PublicCategoryRow[],
  slugs: string[],
): PublicCategoryRow[] | null {
  if (slugs.length === 0) {
    return [];
  }

  const byParent = groupByParent(rows);
  const chain: PublicCategoryRow[] = [];
  let parentId: string | null = null;

  for (const slug of slugs) {
    const match: PublicCategoryRow | undefined = byParent
      .get(parentId)
      ?.find((row) => row.slug === slug);

    if (!match) {
      return null;
    }

    chain.push(match);
    parentId = match.id;
  }

  return chain;
}

export function getCategoryCrumbs(chain: PublicCategoryRow[]): PublicCategoryCrumb[] {
  const slugs: string[] = [];

  return chain.map((row) => {
    slugs.push(row.slug);
    return { name: row.name, href: categoryHref(slugs) };
  });
}

export function getDescendantCategoryIds(rows: PublicCategoryRow[], categoryId: string): string[] {
  const byParent = groupByParent(rows);
  const ids: string[] = [];
  const pending = [categoryId];
  const seen = new Set<string>();

  while (pending.length > 0) {
    const id = pending.pop();

    if (id === undefined || seen.has(id)) {
      continue;
    }

    seen.add(id);
    ids.push(id);

    for (const child of byParent.get(id) ?? []) {
      pending.push(child.id);
    }
  }

  return ids;
}

export function buildCategoryNodes(rows: PublicCategoryRow[]): PublicCategoryNode[] {
  const byParent = groupByParent(rows);
  const visited = new Set<string>();

  function build(parentId: string | null, slugs: string[]): PublicCategoryNode[] {
    return (byParent.get(parentId) ?? []).flatMap((row) => {
      if (visited.has(row.id)) {
        return [];
      }

      visited.add(row.id);
      const path = [...slugs, row.slug];

      return [
        {
          id: row.id,
          name: row.name,
          href: categoryHref(path),
          children: build(row.id, path),
        },
      ];
    });
  }

  return build(null, []);
}
