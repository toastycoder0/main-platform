import Link from 'next/link';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import type { MovementEntryRowDTO } from '../application/warehouse.types';
import {
  formatMovementDate,
  formatMovementQuantity,
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
} from './warehouse-history-config';

interface WarehouseMovementEntriesTableProps {
  items: MovementEntryRowDTO[];
}

export function WarehouseMovementEntriesTable({ items }: WarehouseMovementEntriesTableProps) {
  return (
    <ListTable
      columns={[
        { key: 'date', label: 'Fecha', className: 'w-44' },
        { key: 'movement', label: '# Mov.', className: 'w-20' },
        { key: 'type', label: 'Tipo', className: 'w-32' },
        { key: 'reason', label: 'Motivo', className: 'w-36' },
        { key: 'lot', label: 'Lote', className: 'w-32' },
        { key: 'product', label: 'Producto / variante' },
        { key: 'origin', label: 'Origen', className: 'w-28' },
        { key: 'destination', label: 'Destino', className: 'w-28' },
        { key: 'quantity', label: 'Cantidad', className: 'w-28 text-right' },
      ]}
    >
      {items.map((item) => (
        <TableRow key={item.id}>
          <ListCell className='whitespace-nowrap text-muted-foreground'>
            {formatMovementDate(item.createdAt)}
          </ListCell>
          <ListCell>
            <Link
              className='font-mono text-xs tabular-nums text-primary underline-offset-4 hover:underline'
              href={`/warehouse/movements/${item.movementId}`}
            >
              #{item.sequentialNumber}
            </Link>
          </ListCell>
          <ListCell>{MOVEMENT_TYPE_LABELS[item.type]}</ListCell>
          <ListCell className='text-muted-foreground'>
            {item.reason ? MOVEMENT_REASON_LABELS[item.reason] : '—'}
          </ListCell>
          <ListCell className='font-mono text-xs'>{item.lotCode}</ListCell>
          <ListCell
            className='max-w-64 truncate'
            title={`${item.productTitle} / ${item.itemTitle}`}
          >
            <span className='block truncate'>{item.productTitle}</span>
            <span className='block truncate text-xs text-muted-foreground'>{item.itemTitle}</span>
          </ListCell>
          <ListCell className='font-mono text-xs'>{item.originCellCode ?? '—'}</ListCell>
          <ListCell className='font-mono text-xs'>{item.destinationCellCode ?? '—'}</ListCell>
          <ListCell className='text-right font-mono tabular-nums'>
            {formatMovementQuantity(item.quantity)}
          </ListCell>
        </TableRow>
      ))}
    </ListTable>
  );
}
