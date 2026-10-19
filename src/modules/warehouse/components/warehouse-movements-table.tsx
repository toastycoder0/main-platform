import Link from 'next/link';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { TableRow } from '@/shared/components/table';
import type { MovementListItemDTO } from '../application/warehouse.types';
import {
  formatMovementDate,
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
} from './warehouse-history-config';

interface WarehouseMovementsTableProps {
  items: MovementListItemDTO[];
}

export function WarehouseMovementsTable({ items }: WarehouseMovementsTableProps) {
  return (
    <ListTable
      columns={[
        { key: 'sequential', label: '#', className: 'w-20' },
        { key: 'date', label: 'Fecha', className: 'w-44' },
        { key: 'type', label: 'Tipo', className: 'w-36' },
        { key: 'reason', label: 'Motivo', className: 'w-40' },
        { key: 'title', label: 'Título' },
        { key: 'entries', label: 'Elementos', className: 'w-24 text-right' },
      ]}
    >
      {items.map((item) => (
        <TableRow key={item.id}>
          <ListCell>
            <Link
              className='font-mono text-xs tabular-nums text-primary underline-offset-4 hover:underline'
              href={`/warehouse/movements/${item.id}`}
            >
              #{item.sequentialNumber}
            </Link>
          </ListCell>
          <ListCell className='whitespace-nowrap text-muted-foreground'>
            {formatMovementDate(item.createdAt)}
          </ListCell>
          <ListCell>{MOVEMENT_TYPE_LABELS[item.type]}</ListCell>
          <ListCell className='text-muted-foreground'>
            {item.reason ? MOVEMENT_REASON_LABELS[item.reason] : '—'}
          </ListCell>
          <ListCell className='max-w-96 truncate' title={item.note ?? undefined}>
            {item.note ?? '—'}
          </ListCell>
          <ListCell className='text-right font-mono tabular-nums'>{item.entryCount}</ListCell>
        </TableRow>
      ))}
    </ListTable>
  );
}
