'use client';

import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import type { RefObject } from 'react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';

interface WarehouseMapControlsProps {
  transformRef: RefObject<ReactZoomPanPinchRef | null>;
  panelOpen: boolean;
}

const CONTROL_CLASS = 'rounded-none text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900';

export function WarehouseMapControls({ transformRef, panelOpen }: WarehouseMapControlsProps) {
  return (
    <div
      className={cn(
        'absolute bottom-4 z-20 flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm',
        panelOpen ? 'right-84' : 'right-4',
      )}
    >
      <Button
        aria-label='Alejar'
        className={CONTROL_CLASS}
        onClick={() => transformRef.current?.zoomOut(0.25)}
        size='icon-sm'
        type='button'
        variant='ghost'
      >
        <MinusIcon className='size-4' />
      </Button>
      <div className='mx-2 h-px bg-neutral-200' />
      <Button
        aria-label='Acercar'
        className={CONTROL_CLASS}
        onClick={() => transformRef.current?.zoomIn(0.25)}
        size='icon-sm'
        type='button'
        variant='ghost'
      >
        <PlusIcon className='size-4' />
      </Button>
      <div className='mx-2 h-px bg-neutral-200' />
      <Button
        aria-label='Restaurar vista inicial'
        className={CONTROL_CLASS}
        onClick={() => transformRef.current?.resetTransform()}
        size='icon-sm'
        type='button'
        variant='ghost'
      >
        <RotateCcwIcon className='size-4' />
      </Button>
    </div>
  );
}
