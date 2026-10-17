'use client';

import type { MapIndex } from '../application/warehouse.map';
import type { NodeDTO } from '../application/warehouse.types';
import { WarehouseMapCell } from './warehouse-map-cell';

interface WarehouseMapNodeProps {
  node: NodeDTO;
  index: MapIndex;
  selectedCellId: string | null;
  matchedCellIds: Set<string>;
  hasSearch: boolean;
  onSelect: (cellId: string) => void;
}

export function WarehouseMapNode({
  node,
  index,
  selectedCellId,
  matchedCellIds,
  hasSearch,
  onSelect,
}: WarehouseMapNodeProps) {
  const isRoot = node.kind === 'warehouse';
  const isRow = node.cells.length > 0;

  return (
    <div className='flex flex-col gap-2'>
      {isRoot ? (
        <span className='text-xs font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap'>
          {node.name}
        </span>
      ) : (
        <div className='h-9' />
      )}

      <div
        className={isRow ? 'flex flex-nowrap gap-2 w-full flex-row-reverse' : 'flex flex-col gap-2'}
      >
        {node.cells.map((cell) => {
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

        {node.children.map((child) => (
          <WarehouseMapNode
            hasSearch={hasSearch}
            index={index}
            key={child.id}
            matchedCellIds={matchedCellIds}
            node={child}
            onSelect={onSelect}
            selectedCellId={selectedCellId}
          />
        ))}
      </div>
    </div>
  );
}
