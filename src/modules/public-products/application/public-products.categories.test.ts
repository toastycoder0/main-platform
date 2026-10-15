import { describe, expect, it } from 'vitest';
import {
  buildCategoryNodes,
  categoryHref,
  getCategoryCrumbs,
  getDescendantCategoryIds,
  resolveCategoryChain,
} from './public-products.categories';
import type { PublicCategoryRow } from './public-products.types';

const rows: PublicCategoryRow[] = [
  { id: 'a', parentId: null, slug: 'pisos', name: 'Pisos', sortOrder: 1 },
  { id: 'b', parentId: 'a', slug: 'vinilico', name: 'Vinílico', sortOrder: 0 },
  { id: 'c', parentId: 'b', slug: 'click', name: 'Click', sortOrder: 0 },
  { id: 'd', parentId: null, slug: 'pinturas', name: 'Pinturas', sortOrder: 0 },
  { id: 'e', parentId: 'd', slug: 'vinilico', name: 'Vinílica', sortOrder: 0 },
];

describe('categoryHref', () => {
  it('builds the catalog path for an empty chain', () => {
    expect(categoryHref([])).toBe('/products');
  });

  it('joins nested slugs', () => {
    expect(categoryHref(['pisos', 'vinilico'])).toBe('/products/pisos/vinilico');
  });
});

describe('resolveCategoryChain', () => {
  it('returns an empty chain for no slugs', () => {
    expect(resolveCategoryChain(rows, [])).toEqual([]);
  });

  it('resolves nested slugs level by level', () => {
    expect(resolveCategoryChain(rows, ['pisos', 'vinilico', 'click'])?.map((r) => r.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('disambiguates repeated slugs by parent', () => {
    expect(resolveCategoryChain(rows, ['pinturas', 'vinilico'])?.at(-1)?.id).toBe('e');
  });

  it('returns null when a level does not exist', () => {
    expect(resolveCategoryChain(rows, ['pisos', 'click'])).toBeNull();
  });

  it('does not resolve children of missing parents', () => {
    const withoutRoot = rows.filter((row) => row.id !== 'a');
    expect(resolveCategoryChain(withoutRoot, ['pisos', 'vinilico'])).toBeNull();
  });
});

describe('getCategoryCrumbs', () => {
  it('accumulates hrefs along the chain', () => {
    const chain = resolveCategoryChain(rows, ['pisos', 'vinilico']) ?? [];

    expect(getCategoryCrumbs(chain)).toEqual([
      { name: 'Pisos', href: '/products/pisos' },
      { name: 'Vinílico', href: '/products/pisos/vinilico' },
    ]);
  });
});

describe('getDescendantCategoryIds', () => {
  it('includes the category and all nested descendants', () => {
    expect(getDescendantCategoryIds(rows, 'a').sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns only itself for a leaf', () => {
    expect(getDescendantCategoryIds(rows, 'c')).toEqual(['c']);
  });
});

describe('buildCategoryNodes', () => {
  it('builds a sorted tree with nested hrefs', () => {
    const tree = buildCategoryNodes(rows);

    expect(tree.map((node) => node.name)).toEqual(['Pinturas', 'Pisos']);
    expect(tree[1]?.children[0]?.children[0]?.href).toBe('/products/pisos/vinilico/click');
  });

  it('drops orphans whose parent is not in the list', () => {
    const orphaned = [{ id: 'x', parentId: 'missing', slug: 'x', name: 'X', sortOrder: 0 }];
    expect(buildCategoryNodes(orphaned)).toEqual([]);
  });
});
