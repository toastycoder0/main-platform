'use client';

import { SearchXIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { Button } from '@/shared/components/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/empty';
import { movementHistoryParams } from '../infrastructure/warehouse.params';

interface MovementHistoryEmptyStateProps {
  entity: 'movimientos' | 'elementos';
  outOfRange: boolean;
}

export function MovementHistoryEmptyState({ entity, outOfRange }: MovementHistoryEmptyStateProps) {
  const [, setParams] = useQueryStates(movementHistoryParams);
  const [isPending, startTransition] = useTransition();

  function reset() {
    startTransition(() => {
      if (outOfRange) {
        setParams({ page: 1 });
        return;
      }

      setParams({
        q: null,
        type: null,
        reason: null,
        from: null,
        to: null,
        lot: null,
        cell: null,
        page: 1,
      });
    });
  }

  return (
    <Empty data-slot='list-empty'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          {outOfRange ? `No hay ${entity} en esta página` : `No se encontraron ${entity}`}
        </EmptyTitle>
        <EmptyDescription>
          {outOfRange
            ? 'La página solicitada está fuera de rango.'
            : 'Ajusta la búsqueda o elimina algunos filtros para ver resultados.'}
        </EmptyDescription>
      </EmptyHeader>
      <Button disabled={isPending} onClick={reset} size='sm' type='button' variant='outline'>
        {outOfRange ? 'Ir a la primera página' : 'Limpiar búsqueda y filtros'}
      </Button>
    </Empty>
  );
}
