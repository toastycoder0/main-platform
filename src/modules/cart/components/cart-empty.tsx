import { ShoppingCartIcon } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/empty';

export function CartEmpty() {
  return (
    <Empty className='border'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <ShoppingCartIcon />
        </EmptyMedia>
        <EmptyTitle>Tu carrito está vacío</EmptyTitle>
        <EmptyDescription>
          Explora el catálogo y añade los productos que necesites.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href='/products' className={buttonVariants()}>
          Ver productos
        </Link>
      </EmptyContent>
    </Empty>
  );
}
