import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/empty';

interface ListEmptyStateProps {
  entity: string;
  outOfRange: boolean;
}

export function ListEmptyState({ entity, outOfRange }: ListEmptyStateProps) {
  return (
    <Empty data-slot='list-empty'>
      <EmptyHeader>
        <EmptyMedia variant='icon' />
        <EmptyTitle>
          {outOfRange ? `No hay ${entity} en esta página` : `No se encontraron ${entity}`}
        </EmptyTitle>
        <EmptyDescription>
          {outOfRange
            ? 'La página solicitada está fuera de rango.'
            : 'Ajusta la búsqueda para ver resultados.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
