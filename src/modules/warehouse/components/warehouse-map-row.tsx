'use client';

import type { MapIndex } from '../application/warehouse.map';
import type { CellDTO } from '../application/warehouse.types';
import { WarehouseMapCell } from './warehouse-map-cell';

interface WarehouseMapRowProps {
  cells: CellDTO[];
  index: MapIndex;
  selectedCellId: string | null;
  matchedCellIds: Set<string>;
  hasSearch: boolean;
  onSelect: (cellId: string) => void;
}

export function WarehouseMapRow({
  cells,
  index,
  selectedCellId,
  matchedCellIds,
  hasSearch,
  onSelect,
}: WarehouseMapRowProps) {
  return (
    <div className='flex flex-nowrap gap-4 w-full flex-row-reverse'>
      {cells.map((cell) => {
        const entry = index.get(cell.id);

        if (!entry) {
          return null;
        }

        const searchMatch = hasSearch && matchedCellIds.has(cell.id);

        return (
          <WarehouseMapCell
            cell={cell}
            key={cell.id}
            occupancy={entry.occupancy}
            onSelect={onSelect}
            searchDimmed={hasSearch && !searchMatch}
            searchMatch={searchMatch}
            selected={selectedCellId === cell.id}
          />
        );
      })}
    </div>
  );
}
