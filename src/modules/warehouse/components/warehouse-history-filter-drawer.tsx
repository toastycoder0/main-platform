'use client';

import { ListFilterIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';
import type { MovementCellOptionDTO, MovementLotOptionDTO } from '../application/warehouse.types';
import { MovementHistoryFilters } from './warehouse-history-filters';

interface MovementHistoryFilterDrawerProps {
  lots: MovementLotOptionDTO[];
  cells: MovementCellOptionDTO[];
}

export function MovementHistoryFilterDrawer({ lots, cells }: MovementHistoryFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className='lg:hidden' size='sm' type='button' variant='outline'>
          <ListFilterIcon className='size-4' />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent className='max-h-full overflow-y-auto' side='left'>
        <SheetHeader className='mt-16 md:mt-0'>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className='px-4 pb-6'>
          <MovementHistoryFilters cells={cells} idPrefix='history-drawer' lots={lots} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
