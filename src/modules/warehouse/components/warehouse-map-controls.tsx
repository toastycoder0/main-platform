'use client';

import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import type { RefObject } from 'react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { cn } from '@/shared/utils/cn';

interface WarehouseMapControlsProps {
  transformRef: RefObject<ReactZoomPanPinchRef | null>;
  panelOpen: boolean;
}

export function WarehouseMapControls({ transformRef, panelOpen }: WarehouseMapControlsProps) {
  return (
    <div
      className={cn(
        'absolute bottom-4 z-20 flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm',
        panelOpen ? 'right-84' : 'right-4',
      )}
    >
      <button
        aria-label='Alejar'
        className='p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
        onClick={() => transformRef.current?.zoomOut(0.25)}
        type='button'
      >
        <MinusIcon className='size-4' />
      </button>
      <div className='mx-2 h-px bg-neutral-200' />
      <button
        aria-label='Acercar'
        className='p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
        onClick={() => transformRef.current?.zoomIn(0.25)}
        type='button'
      >
        <PlusIcon className='size-4' />
      </button>
      <div className='mx-2 h-px bg-neutral-200' />
      <button
        aria-label='Restaurar vista inicial'
        className='p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900'
        onClick={() => transformRef.current?.resetTransform()}
        type='button'
      >
        <RotateCcwIcon className='size-4' />
      </button>
    </div>
  );
}
