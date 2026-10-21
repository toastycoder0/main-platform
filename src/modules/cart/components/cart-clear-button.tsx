'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { clearCart } from '../infrastructure/cart.action';

export function CartClearButton() {
  const [isPending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      await submitAction(() => clearCart());
    });
  }

  return (
    <DestructiveConfirm
      label='Vaciar carrito'
      title='¿Vaciar el carrito?'
      description='Se quitarán todos los productos del carrito.'
      confirmLabel='Vaciar'
      busy={isPending}
      variant='ghost'
      size='sm'
      className='text-muted-foreground hover:text-destructive'
      onConfirm={clear}
    />
  );
}
