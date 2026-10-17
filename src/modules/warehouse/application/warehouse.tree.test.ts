import { describe, expect, it } from 'vitest';
import { buildWarehouseTree, type MapCellRow, type MapNodeRow } from './warehouse.tree';

function node(overrides: Partial<MapNodeRow> & { id: string }): MapNodeRow {
  return {
    parentId: null,
    name: overrides.id,
    kind: 'rack',
    path: `/${overrides.id}/`,
    sortOrder: 0,
    ...overrides,
  };
}

function cell(overrides: Partial<MapCellRow> & { id: string; nodeId: string }): MapCellRow {
  return {
    code: overrides.id.toUpperCase(),
    position: 0,
    capacity: 100,
    occupancy: 0,
    isActive: true,
    ...overrides,
  };
}

describe('buildWarehouseTree', () => {
  it('nests nodes by parentId and attaches cells to their node', () => {
    const tree = buildWarehouseTree(
      [node({ id: 'root' }), node({ id: 'child', parentId: 'root' })],
      [cell({ id: 'c1', nodeId: 'root' }), cell({ id: 'c2', nodeId: 'child' })],
    );

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe('root');
    expect(tree[0]?.cells.map((c) => c.id)).toEqual(['c1']);
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['child']);
    expect(tree[0]?.children[0]?.cells.map((c) => c.id)).toEqual(['c2']);
  });

  it('orders siblings by sortOrder and cells by position', () => {
    const tree = buildWarehouseTree(
      [
        node({ id: 'b', sortOrder: 2 }),
        node({ id: 'a', sortOrder: 1 }),
        node({ id: 'c', sortOrder: 1 }),
      ],
      [cell({ id: 'x', nodeId: 'a', position: 2 }), cell({ id: 'y', nodeId: 'a', position: 1 })],
    );

    expect(tree.map((n) => n.id)).toEqual(['a', 'c', 'b']);
    expect(tree[0]?.cells.map((c) => c.position)).toEqual([1, 2]);
  });

  it('aggregates subtree occupancy into each node', () => {
    const tree = buildWarehouseTree(
      [node({ id: 'root' }), node({ id: 'child', parentId: 'root' })],
      [
        cell({ id: 'c1', nodeId: 'root', occupancy: 30 }),
        cell({ id: 'c2', nodeId: 'child', occupancy: 12 }),
      ],
    );

    expect(tree[0]?.occupancy).toBe(42);
    expect(tree[0]?.children[0]?.occupancy).toBe(12);
  });

  it('keeps nodes without cells, with zero occupancy', () => {
    const tree = buildWarehouseTree([node({ id: 'empty' })], []);

    expect(tree[0]?.cells).toEqual([]);
    expect(tree[0]?.occupancy).toBe(0);
  });

  it('omits nodes that are not reachable from a root (e.g. a cycle)', () => {
    const tree = buildWarehouseTree(
      [node({ id: 'a', parentId: 'b' }), node({ id: 'b', parentId: 'a' })],
      [],
    );

    expect(tree).toEqual([]);
  });
});
