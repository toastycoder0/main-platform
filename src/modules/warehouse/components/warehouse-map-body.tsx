'use client';

import { cn } from '@/shared/utils/cn';
import type { MapIndex } from '../application/warehouse.map';
import type { NodeDTO } from '../application/warehouse.types';
import { WarehouseMapRow } from './warehouse-map-row';

interface WarehouseMapBodyProps {
  node: NodeDTO;
  index: MapIndex;
  selectedCellId: string | null;
  matchedCellIds: Set<string>;
  hasSearch: boolean;
  onSelect: (cellId: string) => void;
  depth: number;
}

export function WarehouseMapBody({
  node,
  index,
  selectedCellId,
  matchedCellIds,
  hasSearch,
  onSelect,
  depth,
}: WarehouseMapBodyProps) {
  if (node.cells.length > 0) {
    return (
      <WarehouseMapRow
        cells={node.cells}
        hasSearch={hasSearch}
        index={index}
        matchedCellIds={matchedCellIds}
        onSelect={onSelect}
        selectedCellId={selectedCellId}
      />
    );
  }

  return (
    <div className={cn('flex flex-col', depth === 0 ? 'gap-20' : 'gap-4')}>
      {node.children.map((child) => (
        <WarehouseMapBody
          depth={depth + 1}
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
  );
}
