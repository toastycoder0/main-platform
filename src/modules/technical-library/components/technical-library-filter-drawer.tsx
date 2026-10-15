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
import type { LibraryFilterCounts } from '../application/technical-library.types';
import { TechnicalLibraryFilters } from './technical-library-filters';

export function TechnicalLibraryFilterDrawer({
  filterCounts,
}: {
  filterCounts: LibraryFilterCounts;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type='button' variant='outline' size='sm' className='lg:hidden'>
          <ListFilterIcon className='size-4' />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side='left' className='max-h-full overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className='px-4 pb-6'>
          <TechnicalLibraryFilters filterCounts={filterCounts} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
