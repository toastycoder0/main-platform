import { type CellOccupancy, computeCellOccupancy } from './warehouse.occupancy';
import type { CellDTO, MapStockRowDTO, NodeDTO } from './warehouse.types';

export interface CellStockDetail {
  lotId: string;
  lotCode: string;
  lotName: string;
  productTitle: string;
  itemTitle: string;
  quantity: number;
}

export interface MapCellIndexEntry {
  cell: CellDTO;
  ancestors: string[];
  occupancy: CellOccupancy;
  stock: CellStockDetail[];
  searchText: string;
}

export type MapIndex = Map<string, MapCellIndexEntry>;

export function normalizeMapSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toStockDetail(row: MapStockRowDTO): CellStockDetail {
  return {
    lotId: row.lotId,
    lotCode: row.lotCode,
    lotName: row.lotName,
    productTitle: row.productTitle,
    itemTitle: row.itemTitle,
    quantity: row.quantity,
  };
}

export function buildMapIndex(nodes: NodeDTO[], stock: MapStockRowDTO[]): MapIndex {
  const stockByCell = new Map<string, CellStockDetail[]>();

  for (const row of stock) {
    const details = stockByCell.get(row.cellId) ?? [];
    details.push(toStockDetail(row));
    stockByCell.set(row.cellId, details);
  }

  const index: MapIndex = new Map();

  function walk(node: NodeDTO, ancestors: string[]): void {
    const nextAncestors = [...ancestors, node.name];

    for (const cell of node.cells) {
      const details = stockByCell.get(cell.id) ?? [];
      const searchText = normalizeMapSearch(
        [
          cell.code,
          ...details.flatMap((detail) => [
            detail.productTitle,
            detail.itemTitle,
            detail.lotCode,
            detail.lotName,
          ]),
        ].join(' '),
      );

      index.set(cell.id, {
        cell,
        ancestors: nextAncestors,
        occupancy: computeCellOccupancy(cell.occupancy, cell.capacity),
        stock: details,
        searchText,
      });
    }

    for (const child of node.children) {
      walk(child, nextAncestors);
    }
  }

  for (const node of nodes) {
    walk(node, []);
  }

  return index;
}

export function findMatchingCellIds(index: MapIndex, query: string): Set<string> {
  const term = normalizeMapSearch(query.trim());

  if (term.length === 0) {
    return new Set();
  }

  const matches = new Set<string>();

  for (const [cellId, entry] of index) {
    if (entry.searchText.includes(term)) {
      matches.add(cellId);
    }
  }

  return matches;
}
