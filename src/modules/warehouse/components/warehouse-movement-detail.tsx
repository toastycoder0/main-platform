import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { ListCell, ListTable } from '@/shared/components/list-table';
import { Skeleton } from '@/shared/components/skeleton';
import { TableRow } from '@/shared/components/table';
import type { MovementDTO } from '../application/warehouse.types';
import { LotPageLayout } from './lot-page-layout';
import { NAV_LINK_CLASS } from './warehouse.styles';
import { DetailRow } from './warehouse-detail-row';
import {
  formatMovementDate,
  formatMovementQuantity,
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
} from './warehouse-history-config';
import { WarehouseRevertButton } from './warehouse-revert-button';

interface WarehouseMovementDetailProps {
  canRevert: boolean;
  movement: MovementDTO;
}

function kindLabel(movement: MovementDTO): string {
  // Reverts carry no reason (DB check), every other movement does.
  return movement.reason
    ? MOVEMENT_REASON_LABELS[movement.reason]
    : MOVEMENT_TYPE_LABELS[movement.type];
}

function RelationCard({ movement }: { movement: MovementDTO }) {
  const hasReverts = movement.revertsId !== null && movement.revertsSequentialNumber !== null;
  const hasRevertedBy =
    movement.revertedById !== null && movement.revertedBySequentialNumber !== null;

  if (!hasReverts && !hasRevertedBy) {
    return null;
  }

  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>Relación</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-1'>
          {hasReverts ? (
            <Link className={NAV_LINK_CLASS} href={`/warehouse/movements/${movement.revertsId}`}>
              <span className='text-sm text-muted-foreground'>Reversión de</span>
              <span className='font-mono text-xs'>#{movement.revertsSequentialNumber}</span>
            </Link>
          ) : null}
          {hasRevertedBy ? (
            <Link className={NAV_LINK_CLASS} href={`/warehouse/movements/${movement.revertedById}`}>
              <span className='text-sm text-muted-foreground'>Revertido por</span>
              <span className='font-mono text-xs'>#{movement.revertedBySequentialNumber}</span>
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function WarehouseMovementDetail({ canRevert, movement }: WarehouseMovementDetailProps) {
  return (
    <div className='flex flex-col gap-4'>
      <Button asChild className='-ml-2 w-fit' size='sm' variant='ghost'>
        <Link href='/warehouse/movements'>
          <ArrowLeftIcon />
          Volver a movimientos
        </Link>
      </Button>

      <LotPageLayout
        actions={
          canRevert ? (
            <WarehouseRevertButton
              movementId={movement.id}
              sequentialNumber={movement.sequentialNumber}
            />
          ) : null
        }
        aside={
          <>
            <Card size='sm'>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className='flex flex-col gap-2'>
                  <DetailRow label='Fecha' value={formatMovementDate(movement.createdAt)} />
                  <DetailRow label='Registró' value={movement.userName ?? '—'} />
                  <DetailRow label='Nota' value={movement.note ?? '—'} />
                  <DetailRow label='Referencia' value={movement.reference ?? '—'} />
                  <DetailRow label='ID' mono value={movement.id} />
                </dl>
              </CardContent>
            </Card>

            <RelationCard movement={movement} />
          </>
        }
        subtitle={
          <span className='flex flex-wrap items-center gap-2'>
            <Badge variant='secondary'>{kindLabel(movement)}</Badge>
            {movement.revertedById ? <Badge variant='destructive'>Revertido</Badge> : null}
          </span>
        }
        title={`Movimiento #${movement.sequentialNumber}`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Entradas</CardTitle>
            <CardAction>
              <Badge variant='outline'>
                {movement.entries.length} {movement.entries.length === 1 ? 'entrada' : 'entradas'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {movement.entries.length === 0 ? (
              <p className='text-sm text-muted-foreground'>Sin entradas registradas.</p>
            ) : (
              <ListTable
                columns={[
                  { key: 'lot', label: 'Lote', className: 'w-32' },
                  { key: 'product', label: 'Producto / variante' },
                  { key: 'origin', label: 'Origen', className: 'w-28' },
                  { key: 'destination', label: 'Destino', className: 'w-28' },
                  { key: 'quantity', label: 'Cantidad', className: 'w-28 text-right' },
                ]}
              >
                {movement.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <ListCell className='font-mono text-xs'>{entry.lotCode ?? '—'}</ListCell>
                    <ListCell
                      className='max-w-64 truncate'
                      title={`${entry.productTitle ?? ''} / ${entry.itemTitle ?? ''}`}
                    >
                      <span className='block truncate'>{entry.productTitle ?? '—'}</span>
                      <span className='block truncate text-xs text-muted-foreground'>
                        {entry.itemTitle ?? ''}
                      </span>
                    </ListCell>
                    <ListCell className='font-mono text-xs'>{entry.originCellCode ?? '—'}</ListCell>
                    <ListCell className='font-mono text-xs'>
                      {entry.destinationCellCode ?? '—'}
                    </ListCell>
                    <ListCell className='text-right font-mono tabular-nums'>
                      {formatMovementQuantity(entry.quantity)}
                    </ListCell>
                  </TableRow>
                ))}
              </ListTable>
            )}
          </CardContent>
        </Card>
      </LotPageLayout>
    </div>
  );
}

export function MovementDetailSkeleton() {
  return (
    <div aria-hidden='true' className='flex flex-col gap-4'>
      <Skeleton className='h-8 w-48 rounded-md' />
      <Skeleton className='h-7 w-64 rounded-md' />
      <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <Skeleton className='h-72 rounded-xl' />
        <Skeleton className='h-64 rounded-xl' />
      </div>
    </div>
  );
}
