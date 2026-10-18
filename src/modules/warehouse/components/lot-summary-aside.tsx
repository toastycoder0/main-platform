import Link from 'next/link';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import { Skeleton } from '@/shared/components/skeleton';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { buildListHref } from '@/shared/list/list-params';
import { getLotSummary } from '../infrastructure/warehouse.query';
import { NAV_LINK_CLASS } from './warehouse.styles';

const MAX_VISIBLE_CELLS = 8;

function formatDateTime(value: Date): string {
  return value.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatQuantity(value: number): string {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 4 });
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className='flex items-baseline justify-between gap-3'>
      <dt className='shrink-0 text-xs text-muted-foreground'>{label}</dt>
      <dd
        className={`text-right text-xs ${mono ? 'font-mono break-all' : 'tabular-nums text-foreground'}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function LotSummarySkeleton() {
  return (
    <div aria-hidden='true' className='flex flex-col gap-4'>
      <Skeleton className='h-72 rounded-xl' />
      <Skeleton className='h-40 rounded-xl' />
    </div>
  );
}

interface LotSummaryAsideProps {
  lotId: string;
}

export async function LotSummaryAside({ lotId }: LotSummaryAsideProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.warehouse.access)) {
    return null;
  }

  const summary = await getLotSummary(ctx, lotId);

  if (!summary) {
    return null;
  }

  const visibleCells = summary.cells.slice(0, MAX_VISIBLE_CELLS);
  const hiddenCount = summary.cells.length - visibleCells.length;

  return (
    <>
      <Card size='sm'>
        <CardHeader>
          <CardTitle>Stock y ubicaciones</CardTitle>
          <CardAction>
            <Badge variant={summary.isActive ? 'secondary' : 'outline'}>
              {summary.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            <span className='text-2xl font-semibold tabular-nums'>
              {formatQuantity(summary.stock)}
            </span>
            <span className='text-xs text-muted-foreground'>unidades en stock</span>
          </div>

          {summary.cells.length === 0 ? (
            <div className='flex flex-col gap-3'>
              <p className='text-sm text-muted-foreground'>Sin stock asignado.</p>
              <Button asChild size='sm' type='button' variant='outline'>
                <Link href='/warehouse?view=map'>Asignar desde el mapa</Link>
              </Button>
            </div>
          ) : (
            <div className='flex flex-col gap-1'>
              {visibleCells.map((cell) => (
                <Link
                  key={cell.cellId}
                  className={NAV_LINK_CLASS}
                  href={buildListHref('/warehouse', { view: 'map', highlight: cell.cellId })}
                >
                  <span className='font-mono text-xs'>{cell.cellCode}</span>
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {formatQuantity(cell.quantity)} uds
                  </span>
                </Link>
              ))}
              {hiddenCount > 0 ? (
                <p className='px-2 pt-1 text-xs text-muted-foreground'>
                  y {hiddenCount} {hiddenCount === 1 ? 'ubicación' : 'ubicaciones'} más
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card size='sm'>
        <CardHeader>
          <CardTitle>Detalles</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className='flex flex-col gap-2'>
            <DetailRow label='ID' value={lotId} mono />
            <DetailRow label='Creado' value={formatDateTime(summary.createdAt)} />
            <DetailRow label='Actualizado' value={formatDateTime(summary.updatedAt)} />
            <DetailRow label='Movimientos' value={formatQuantity(summary.movementCount)} />
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
