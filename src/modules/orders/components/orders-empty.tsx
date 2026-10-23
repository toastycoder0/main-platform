import { PackageOpenIcon, SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/empty';

interface OrdersEmptyProps {
  hasFilters: boolean;
  outOfRange: boolean;
}

export function OrdersEmpty({ hasFilters, outOfRange }: OrdersEmptyProps) {
  if (!hasFilters && !outOfRange) {
    return (
      <Empty data-slot='orders-empty'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <PackageOpenIcon />
          </EmptyMedia>
          <EmptyTitle>Aún no tienes pedidos</EmptyTitle>
          <EmptyDescription>
            Explora el catálogo y realiza tu primera compra. Tus pedidos aparecerán aquí.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href='/products'>Explorar productos</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty data-slot='orders-empty'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          {outOfRange
            ? 'No hay pedidos en esta página'
            : 'No encontramos pedidos con estos filtros'}
        </EmptyTitle>
        <EmptyDescription>
          {outOfRange
            ? 'La página solicitada está fuera de rango.'
            : 'Prueba con otros estados o limpia los filtros para ver todos tus pedidos.'}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant='outline'>
          <Link href='/orders'>Ver todos los pedidos</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
