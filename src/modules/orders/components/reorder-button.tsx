'use client';

import { RotateCcwIcon } from 'lucide-react';
import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Spinner } from '@/shared/components/spinner';
import { reorderOrder } from '../infrastructure/orders.action';

export function ReorderButton({ orderId, isOwner }: { orderId: string; isOwner: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (!isOwner) {
    return null;
  }

  function reorder() {
    startTransition(async () => {
      await submitAction(() => reorderOrder({ orderId }));
    });
  }

  return (
    <Button
      type='button'
      variant='secondary'
      size='sm'
      onClick={reorder}
      disabled={isPending}
      aria-label='Volver a comprar este pedido'
    >
      {isPending ? <Spinner /> : <RotateCcwIcon />}
      Volver a comprar
    </Button>
  );
}
