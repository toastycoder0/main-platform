import { describe, expect, it } from 'vitest';
import {
  buildCategoryTree,
  type CategoryTreeNode,
  flattenVisibleRows,
  getCategoryPath,
} from './categories.tree';

interface TestRow {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

function row(id: string, parentId: string | null, sortOrder: number): TestRow {
  return { id, parentId, sortOrder };
}

describe('buildCategoryTree', () => {
  it('builds a flat list of rows into a nested tree', () => {
    const rows = [
      row('root_a', null, 0),
      row('child_a1', 'root_a', 0),
      row('child_a2', 'root_a', 1),
    ];

    const tree = buildCategoryTree(rows);

    expect(tree).toHaveLength(1);
    const root = tree[0] as CategoryTreeNode<TestRow>;
    expect(root.id).toBe('root_a');
    expect(root.children).toHaveLength(2);
    expect(root.children[0]?.id).toBe('child_a1');
    expect(root.children[1]?.id).toBe('child_a2');
  });

  it('handles multiple roots', () => {
    const rows = [row('root_a', null, 0), row('root_b', null, 1)];

    const tree = buildCategoryTree(rows);

    expect(tree).toHaveLength(2);
    expect(tree[0]?.id).toBe('root_a');
    expect(tree[1]?.id).toBe('root_b');
  });

  it('sorts siblings by sortOrder then by id', () => {
    const rows = [row('z', null, 2), row('a', null, 1), row('m', null, 1)];

    const tree = buildCategoryTree(rows);

    expect(tree[0]?.id).toBe('a');
    expect(tree[1]?.id).toBe('m');
    expect(tree[2]?.id).toBe('z');
  });

  it('returns an empty array for no rows', () => {
    expect(buildCategoryTree([])).toEqual([]);
  });

  it('detects cycles and throws', () => {
    const rows = [
      row('root', null, 0),
      row('a', 'root', 0),
      row('b', 'a', 0),
      { id: 'root', parentId: 'b', sortOrder: 0 },
    ];

    expect(() => buildCategoryTree(rows)).toThrow('Cycle detected');
  });
});

describe('flattenVisibleRows', () => {
  it('flattens a tree with expanded nodes', () => {
    const tree: CategoryTreeNode<TestRow>[] = [
      {
        ...row('root', null, 0),
        children: [
          { ...row('child', 'root', 0), children: [] },
          { ...row('child2', 'root', 1), children: [] },
        ],
      },
    ];

    const expanded = { root: true, child: true, child2: true };
    const flat = flattenVisibleRows(tree, expanded);

    expect(flat).toHaveLength(3);
    expect(flat[0]?.depth).toBe(0);
    expect(flat[0]?.node.id).toBe('root');
    expect(flat[1]?.depth).toBe(1);
    expect(flat[1]?.node.id).toBe('child');
    expect(flat[2]?.depth).toBe(1);
    expect(flat[2]?.node.id).toBe('child2');
  });

  it('collapses children when a node is not expanded', () => {
    const tree: CategoryTreeNode<TestRow>[] = [
      { ...row('root', null, 0), children: [{ ...row('child', 'root', 0), children: [] }] },
    ];

    const expanded = { root: false };
    const flat = flattenVisibleRows(tree, expanded);

    expect(flat).toHaveLength(1);
    expect(flat[0]?.node.id).toBe('root');
    expect(flat[0]?.hasChildren).toBe(true);
    expect(flat[0]?.isExpanded).toBe(false);
  });

  it('sets hasChildren and isExpanded correctly', () => {
    const tree: CategoryTreeNode<TestRow>[] = [
      { ...row('root', null, 0), children: [{ ...row('child', 'root', 0), children: [] }] },
    ];

    const flat = flattenVisibleRows(tree, { root: true, child: true });

    expect(flat[0]?.hasChildren).toBe(true);
    expect(flat[0]?.isExpanded).toBe(true);
    expect(flat[1]?.hasChildren).toBe(false);
    expect(flat[1]?.isExpanded).toBe(true);
  });
});

describe('getCategoryPath', () => {
  it('builds a breadcrumb string from node names', () => {
    const rows = [
      { id: 'cat_a', name: 'Pisos', path: 'cat_a' },
      { id: 'cat_b', name: 'Vinílicos', path: 'cat_a/cat_b' },
      { id: 'cat_c', name: 'Comercial', path: 'cat_a/cat_b/cat_c' },
    ];

    expect(getCategoryPath(rows, 'cat_c')).toBe('Pisos > Vinílicos > Comercial');
  });

  it('returns the node id when the node is not found', () => {
    const rows = [{ id: 'cat_a', name: 'Pisos', path: 'cat_a' }];
    expect(getCategoryPath(rows, 'unknown')).toBe('unknown');
  });
});
