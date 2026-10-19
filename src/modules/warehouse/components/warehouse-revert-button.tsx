'use client';

import { RotateCcwIcon } from 'lucide-react';
import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { revertMovementAction } from '../infrastructure/warehouse.action';

interface WarehouseRevertButtonProps {
  movementId: string;
  sequentialNumber: number;
}

export function WarehouseRevertButton({
  movementId,
  sequentialNumber,
}: WarehouseRevertButtonProps) {
  const [isPending, startTransition] = useTransition();

  function revert() {
    startTransition(async () => {
      // The action redirects back to this detail page, so the server refreshes
      // the movement, its reversal badge and this very button.
      await submitAction(() => revertMovementAction({ movementId }), 'Movimiento revertido');
    });
  }

  return (
    <DestructiveConfirm
      busy={isPending}
      confirmLabel='Sí, revertir'
      description='Se creará una reversión que restaura el stock a su estado anterior. El movimiento original permanece en el historial.'
      icon={RotateCcwIcon}
      label='Revertir'
      onConfirm={revert}
      title={`¿Revertir el movimiento #${sequentialNumber}?`}
    />
  );
}
