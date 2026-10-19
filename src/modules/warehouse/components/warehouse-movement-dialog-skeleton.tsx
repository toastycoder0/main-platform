'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { Button } from '@/shared/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialog';
import { Skeleton } from '@/shared/components/skeleton';
import { movementParams } from '../infrastructure/warehouse.params';

export function WarehouseMovementDialogSkeleton() {
  const [isPending, startTransition] = useTransition();
  const [, setParams] = useQueryStates(movementParams);

  function close() {
    startTransition(() => {
      setParams({ movement: null, lot: null, cell: null });
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
    >
      <DialogContent className='flex max-h-[85vh] flex-col overflow-hidden sm:max-h-[90vh] sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>Registrar movimientos</DialogTitle>
          <DialogDescription>Cargando lotes y celdas…</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <Skeleton className='h-16' />
            <Skeleton className='h-16' />
            <Skeleton className='h-16' />
          </div>
          <Skeleton className='h-40' />
          <Skeleton className='h-8 w-40' />
        </div>

        <div className='flex justify-end border-t pt-4'>
          <Button disabled={isPending} onClick={close} type='button' variant='outline'>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
