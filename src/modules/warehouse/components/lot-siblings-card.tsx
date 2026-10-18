import Link from 'next/link';
import { Badge } from '@/shared/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/card';
import type { LotSiblingDTO } from '../application/warehouse.types';
import { NAV_LINK_CLASS } from './warehouse.styles';

function formatQuantity(value: number): string {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 4 });
}

interface LotSiblingsCardProps {
  itemId: string;
  lots: LotSiblingDTO[];
}

export function LotSiblingsCard({ itemId, lots }: LotSiblingsCardProps) {
  const siblings = itemId ? lots.filter((sibling) => sibling.itemId === itemId) : [];

  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>Lotes de esta variante</CardTitle>
      </CardHeader>
      <CardContent>
        {itemId === '' ? (
          <p className='text-sm text-muted-foreground'>
            Selecciona un producto o variante para ver sus lotes.
          </p>
        ) : siblings.length === 0 ? (
          <p className='text-sm text-muted-foreground'>Esta variante aún no tiene lotes.</p>
        ) : (
          <div className='flex flex-col gap-1'>
            {siblings.map((sibling) => (
              <Link
                key={sibling.id}
                className={NAV_LINK_CLASS}
                href={`/warehouse/lots/form/${sibling.id}`}
              >
                <span className='font-mono text-xs'>{sibling.code}</span>
                <span className='flex items-center gap-2'>
                  <Badge variant={sibling.isActive ? 'secondary' : 'outline'}>
                    {sibling.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {formatQuantity(sibling.stock)} uds
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
