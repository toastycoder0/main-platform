import { ArrowRightIcon, ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import type { MovementEntryRowDTO } from '../application/warehouse.types';
import { formatMovementDateShort, formatMovementQuantity } from './warehouse-history-config';
import { MovementKindBadge } from './warehouse-movement-kind-badge';

interface WarehouseMovementEntriesTableProps {
  items: MovementEntryRowDTO[];
}

function originLabel(item: MovementEntryRowDTO): string {
  if (item.originCellCode) {
    return item.originCellCode;
  }

  return item.type === 'assign' ? 'Nuevo' : '—';
}

export function WarehouseMovementEntriesTable({ items }: WarehouseMovementEntriesTableProps) {
  return (
    <ListTable
      columns={[
        { key: 'date', label: 'Fecha', className: 'w-40' },
        { key: 'movement', label: '# Mov.', className: 'w-20' },
        { key: 'type', label: 'Tipo', className: 'w-48' },
        { key: 'lot', label: 'Lote', className: 'w-28' },
        { key: 'product', label: 'Producto / variante' },
        { key: 'route', label: 'Origen → Destino', className: 'w-36' },
        { key: 'quantity', label: 'Cantidad', className: 'w-24 text-right' },
        {
          key: 'open',
          label: <span className='sr-only'>Abrir detalle</span>,
          className: 'w-10 text-right',
        },
      ]}
    >
      {items.map((item) => (
        <TableRow className='group relative cursor-pointer focus-within:bg-muted/50' key={item.id}>
          <ListCell className='whitespace-nowrap text-muted-foreground'>
            {formatMovementDateShort(item.createdAt)}
          </ListCell>
          <ListCell>
            <Link
              className='rounded-sm font-mono text-xs tabular-nums text-primary underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
              href={`/warehouse/movements/${item.movementId}`}
            >
              <span className='sr-only'>Ver detalle del movimiento </span>#{item.sequentialNumber}
            </Link>
          </ListCell>
          <ListCell>
            <MovementKindBadge reason={item.reason} type={item.type} />
          </ListCell>
          <ListCell className='font-mono text-xs'>{item.lotCode}</ListCell>
          <ListCell
            className='max-w-64 truncate'
            title={`${item.productTitle} / ${item.itemTitle}`}
          >
            <span className='block truncate'>{item.productTitle}</span>
            <span className='block truncate text-xs text-muted-foreground'>{item.itemTitle}</span>
          </ListCell>
          <ListCell>
            <span className='flex items-center gap-1 font-mono text-xs'>
              <span className={item.originCellCode ? undefined : 'text-muted-foreground'}>
                {originLabel(item)}
              </span>
              <ArrowRightIcon aria-hidden='true' className='size-3 text-muted-foreground' />
              <span className={item.destinationCellCode ? undefined : 'text-muted-foreground'}>
                {item.destinationCellCode ?? '—'}
              </span>
            </span>
          </ListCell>
          <ListCell className='text-right font-mono tabular-nums'>
            {formatMovementQuantity(item.quantity)}
          </ListCell>
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
