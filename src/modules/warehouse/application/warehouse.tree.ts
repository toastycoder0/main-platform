import type { CellDTO, NodeDTO } from './warehouse.types';

export interface MapNodeRow {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  path: string;
  sortOrder: number;
}

export interface MapCellRow {
  id: string;
  nodeId: string;
  code: string;
  position: number;
  capacity: number | null;
  occupancy: number;
  isActive: boolean;
}

/*
 * Assembles the warehouse map in memory. A node's occupancy aggregates every
 * cell in its subtree so collapsed branches still report a meaningful total.
 */
export function buildWarehouseTree(nodes: MapNodeRow[], cells: MapCellRow[]): NodeDTO[] {
  const cellsByNode = new Map<string, MapCellRow[]>();
  for (const cell of cells) {
    const group = cellsByNode.get(cell.nodeId) ?? [];
    group.push(cell);
    cellsByNode.set(cell.nodeId, group);
  }

  const nodesByParent = new Map<string | null, MapNodeRow[]>();
  for (const node of nodes) {
    const group = nodesByParent.get(node.parentId) ?? [];
    group.push(node);
    nodesByParent.set(node.parentId, group);
  }

  function build(parentId: string | null, visiting: Set<string>): NodeDTO[] {
    const group = nodesByParent.get(parentId) ?? [];

    return group
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((node) => {
        if (visiting.has(node.id)) {
          throw new Error(`Cycle detected in warehouse tree at node "${node.id}"`);
        }

        visiting.add(node.id);
        const children = build(node.id, visiting);
        visiting.delete(node.id);

        const nodeCells = (cellsByNode.get(node.id) ?? [])
          .slice()
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
          .map(
            (cell): CellDTO => ({
              id: cell.id,
              code: cell.code,
              position: cell.position,
              capacity: cell.capacity,
              occupancy: cell.occupancy,
              isActive: cell.isActive,
            }),
          );

        const subtreeOccupancy =
          nodeCells.reduce((sum, cell) => sum + cell.occupancy, 0) +
          children.reduce((sum, child) => sum + child.occupancy, 0);

        return {
          id: node.id,
          name: node.name,
          kind: node.kind,
          path: node.path,
          children,
          cells: nodeCells,
          occupancy: subtreeOccupancy,
        };
      });
  }

  return build(null, new Set());
}
