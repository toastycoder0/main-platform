'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { clearCart } from '../infrastructure/cart.action';

export function CartClearButton() {
  const [isPending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      await submitAction(() => clearCart());
    });
  }

  return (
    <Button type='button' variant='ghost' size='sm' disabled={isPending} onClick={clear}>
      Vaciar carrito
    </Button>
  );
}
