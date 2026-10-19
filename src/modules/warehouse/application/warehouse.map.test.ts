import { describe, expect, it } from 'vitest';
import { buildMapIndex, findMatchingCellIds, normalizeMapSearch } from './warehouse.map';
import type { MapStockRowDTO, NodeDTO } from './warehouse.types';

const nodes: NodeDTO[] = [
  {
    id: 'root',
    name: 'Almacén general',
    kind: 'warehouse',
    path: 'almacen_general',
    children: [
      {
        id: 'section',
        name: 'Sección 1',
        kind: 'section',
        path: 'almacen_general.seccion_1',
        children: [
          {
            id: 'row',
            name: 'Fila 1',
            kind: 'row',
            path: 'almacen_general.seccion_1.fila_1',
            children: [],
            cells: [
              {
                id: 'cell-a1',
                code: 'A1',
                position: 1,
                capacity: 100,
                occupancy: 50,
                isActive: true,
              },
              {
                id: 'cell-a2',
                code: 'A2',
                position: 2,
                capacity: null,
                occupancy: 10,
                isActive: true,
              },
            ],
            occupancy: 60,
          },
        ],
        cells: [],
        occupancy: 60,
      },
    ],
    cells: [],
    occupancy: 60,
  },
];

const stock: MapStockRowDTO[] = [
  {
    cellId: 'cell-a1',
    cellCode: 'A1',
    lotId: 'lot-1',
    lotCode: 'LOTE-001',
    productTitle: 'Pintura café',
    itemTitle: 'Blanco maté',
    quantity: 50,
  },
];

describe('normalizeMapSearch', () => {
  it('lowercases and removes diacritics', () => {
    expect(normalizeMapSearch('Almacén')).toBe('almacen');
    expect(normalizeMapSearch('LOTE-001')).toBe('lote-001');
    expect(normalizeMapSearch('Peña')).toBe('pena');
  });
});

describe('buildMapIndex', () => {
  it('indexes every cell with its occupancy and stock', () => {
    const index = buildMapIndex(nodes, stock);
    const a1 = index.get('cell-a1');
    const a2 = index.get('cell-a2');

    expect(index.size).toBe(2);
    expect(a1?.occupancy.percentage).toBe(50);
    expect(a1?.stock).toHaveLength(1);
    expect(a1?.ancestors).toEqual(['Almacén general', 'Sección 1', 'Fila 1']);
    expect(a2?.occupancy.percentage).toBeNull();
    expect(a2?.stock).toHaveLength(0);
  });
});

describe('findMatchingCellIds', () => {
  const index = buildMapIndex(nodes, stock);

  it('matches by cell code', () => {
    expect(findMatchingCellIds(index, 'a1')).toEqual(new Set(['cell-a1']));
  });

  it('matches by lot code', () => {
    expect(findMatchingCellIds(index, 'lote-001')).toEqual(new Set(['cell-a1']));
  });

  it('matches by product title, ignoring accents', () => {
    expect(findMatchingCellIds(index, 'pintura')).toEqual(new Set(['cell-a1']));
    expect(findMatchingCellIds(index, 'cafe')).toEqual(new Set(['cell-a1']));
  });

  it('matches by variant title, ignoring accents', () => {
    expect(findMatchingCellIds(index, 'blanco mate')).toEqual(new Set(['cell-a1']));
  });

  it('returns an empty set for an empty or missing query', () => {
    expect(findMatchingCellIds(index, '')).toEqual(new Set());
    expect(findMatchingCellIds(index, 'no-existe')).toEqual(new Set());
  });
});
