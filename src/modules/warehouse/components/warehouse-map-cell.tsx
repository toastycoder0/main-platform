'use client';

import { memo, useRef } from 'react';
import { cn } from '@/shared/utils/cn';
import type { CellOccupancy } from '../application/warehouse.occupancy';
import type { CellDTO } from '../application/warehouse.types';
import { OccupancyBar } from './occupancy-bar';

interface PointerState {
  startX: number;
  startY: number;
}

function isClickThreshold(state: PointerState, currentX: number, currentY: number): boolean {
  return Math.abs(currentX - state.startX) < 6 && Math.abs(currentY - state.startY) < 6;
}

interface WarehouseMapCellProps {
  cell: CellDTO;
  occupancy: CellOccupancy;
  selected: boolean;
  searchMatch: boolean;
  searchDimmed: boolean;
  onSelect: (cellId: string) => void;
}

export const WarehouseMapCell = memo(function WarehouseMapCell({
  cell,
  occupancy,
  selected,
  searchMatch,
  searchDimmed,
  onSelect,
}: WarehouseMapCellProps) {
  const pointerRef = useRef<PointerState | null>(null);
  const isFocused = searchMatch || selected;

  return (
    <button
      aria-label={`Celda ${cell.code}, ${
        occupancy.percentage === null
          ? `${occupancy.total} unidades`
          : `${occupancy.percentage}% de ocupación`
      }`}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-stretch justify-between rounded-sm border p-1.5 text-xs',
        'transition-colors duration-150 select-none cursor-pointer shrink-0',
        isFocused
          ? 'border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-500 ring-offset-2 hover:bg-blue-100'
          : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-100',
        searchDimmed ? 'opacity-30' : '',
      )}
      data-search-match={searchMatch || undefined}
      data-selected={selected || undefined}
      draggable={false}
      id={`map-cell-${cell.id}`}
      onPointerDown={(event) => {
        pointerRef.current = { startX: event.clientX, startY: event.clientY };
      }}
      onPointerUp={(event) => {
        const state = pointerRef.current;

        if (state && isClickThreshold(state, event.clientX, event.clientY)) {
          onSelect(cell.id);
        }

        pointerRef.current = null;
      }}
      style={{ width: 100, minHeight: 90 }}
      type='button'
    >
      <span className='w-full truncate text-left text-xs font-semibold'>{cell.code}</span>
      <OccupancyBar occupancy={occupancy} />
    </button>
  );
});
