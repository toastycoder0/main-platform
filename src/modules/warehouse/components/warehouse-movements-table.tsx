import { ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import type { MovementListItemDTO } from '../application/warehouse.types';
import { formatMovementDateShort } from './warehouse-history-config';
import { MovementKindBadge } from './warehouse-movement-kind-badge';

interface WarehouseMovementsTableProps {
  items: MovementListItemDTO[];
}

export function WarehouseMovementsTable({ items }: WarehouseMovementsTableProps) {
  return (
    <ListTable
      columns={[
        { key: 'sequential', label: '#', className: 'w-20' },
        { key: 'date', label: 'Fecha', className: 'w-40' },
        { key: 'type', label: 'Tipo', className: 'w-48' },
        { key: 'note', label: 'Nota' },
        { key: 'entries', label: 'Elementos', className: 'w-24 text-right' },
        {
          key: 'open',
          label: <span className='sr-only'>Abrir detalle</span>,
          className: 'w-10 text-right',
        },
      ]}
    >
      {items.map((item) => (
        <TableRow className='group relative cursor-pointer focus-within:bg-muted/50' key={item.id}>
          <ListCell>
            <Link
              className='rounded-sm font-mono text-xs tabular-nums text-primary underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
              href={`/warehouse/movements/${item.id}`}
            >
              <span className='sr-only'>Ver detalle del movimiento </span>#{item.sequentialNumber}
            </Link>
          </ListCell>
          <ListCell className='whitespace-nowrap text-muted-foreground'>
            {formatMovementDateShort(item.createdAt)}
          </ListCell>
          <ListCell>
            <MovementKindBadge reason={item.reason} type={item.type} />
          </ListCell>
          <ListCell className='max-w-96 truncate' title={item.note ?? undefined}>
            {item.note ?? '—'}
          </ListCell>
          <ListCell className='text-right font-mono tabular-nums'>{item.entryCount}</ListCell>
          <ListCell className='text-right'>
            <ExternalLinkIcon
              aria-hidden='true'
              className='inline size-4 text-muted-foreground transition-colors group-hover:text-foreground'
            />
          </ListCell>
        </TableRow>
      ))}
    </ListTable>
  );
}
