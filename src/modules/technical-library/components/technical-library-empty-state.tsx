'use client';

import { SearchXIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { Button } from '@/shared/components/button';
import { libraryParams } from '../infrastructure/technical-library.params';

export function TechnicalLibraryEmptyState() {
  const [, setParams] = useQueryStates(libraryParams);

  function reset() {
    setParams({ q: null, docTypes: [], categories: [], brands: [], page: 1 });
  }

  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center'>
      <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
        <SearchXIcon className='size-6 text-muted-foreground' />
      </div>
      <div>
        <p className='font-medium text-foreground'>No se encontraron documentos</p>
        <p className='mt-1 text-sm text-muted-foreground'>
          Ajusta la búsqueda o elimina algunos filtros para ver resultados.
        </p>
      </div>
      <Button type='button' variant='outline' size='sm' onClick={reset}>
        Limpiar búsqueda y filtros
      </Button>
    </div>
  );
}
