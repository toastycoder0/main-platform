'use client';

import { type FormEvent, useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { placeOrder } from '../infrastructure/checkout.action';
import { StepSubmitButton } from './step-submit-button';

interface PlaceOrderButtonProps {
  version: string;
}

export function PlaceOrderButton({ version }: PlaceOrderButtonProps) {
  const [pending, startTransition] = useTransition();

  function confirm(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(async () => {
      await submitAction(() => placeOrder({ version }), 'Pedido creado');
    });
  }

  return (
    <form onSubmit={confirm}>
      <StepSubmitButton label='Confirmar pedido' pending={pending} final />
    </form>
  );
}
