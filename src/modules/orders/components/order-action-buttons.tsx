'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/dialog';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { Spinner } from '@/shared/components/spinner';
import { Textarea } from '@/shared/components/textarea';
import { ORDER_STATUS_LABELS } from '../application/orders.status';
import type { OrderAction, OrderActionOption, OrderStatus } from '../application/orders.types';
import {
  type OrderCancellationInput,
  type OrderStatusOverrideInput,
  orderCancellationSchema,
  orderStatusOverrideSchema,
} from '../application/orders.validation';
import {
  cancelOrder,
  completeOrder,
  markOrderPaid,
  overrideOrderStatus,
} from '../infrastructure/orders.action';

const OVERRIDE_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function ActionButton({
  option,
  pending,
  onClick,
}: {
  option: OrderActionOption;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type='button'
      size='sm'
      disabled={pending || option.disabledReason !== null}
      title={option.disabledReason ?? undefined}
      onClick={onClick}
    >
      {pending ? <Spinner /> : null}
      {option.label}
    </Button>
  );
}

function CancelOrderDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<OrderCancellationInput>({
    resolver: zodResolver(orderCancellationSchema),
    defaultValues: { orderId, reason: '' },
  });

  function onSubmit(values: OrderCancellationInput) {
    startTransition(async () => {
      const result = await submitAction(
        () => cancelOrder({ orderId, reason: values.reason }),
        'Pedido cancelado',
      );

      if (result.success) {
        setOpen(false);
        form.reset({ orderId, reason: '' });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type='button' size='sm' variant='outline' onClick={() => setOpen(true)}>
        Cancelar pedido
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar pedido</DialogTitle>
          <DialogDescription>
            Libera el apartado de inventario y no se puede deshacer. La cancelación queda en la
            actividad.
          </DialogDescription>
        </DialogHeader>

        <form className='flex flex-col gap-4' onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            name='reason'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='order-cancel-reason'>Motivo (opcional)</FieldLabel>
                <Textarea
                  id='order-cancel-reason'
                  aria-invalid={fieldState.invalid}
                  rows={3}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Volver
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? <Spinner /> : null}
              Cancelar pedido
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OverrideStatusDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<OrderStatusOverrideInput>({
    resolver: zodResolver(orderStatusOverrideSchema),
    defaultValues: { orderId, status: 'pending', reason: '' },
  });

  function onSubmit(values: OrderStatusOverrideInput) {
    startTransition(async () => {
      const result = await submitAction(
        () =>
          overrideOrderStatus({
            orderId,
            status: values.status,
            reason: values.reason,
          }),
        'Estado actualizado',
      );

      if (result.success) {
        setOpen(false);
        form.reset({ orderId, status: 'pending', reason: '' });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type='button' size='sm' variant='outline' onClick={() => setOpen(true)}>
        Cambiar estado (excepción)
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forzar cambio de estado</DialogTitle>
          <DialogDescription>
            Es una acción de excepción: exige un motivo y aplica las consecuencias del estado
            destino, incluida la liberación del apartado.
          </DialogDescription>
        </DialogHeader>

        <form className='flex flex-col gap-4' onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            name='status'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='order-override-status'>Estado destino</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='order-override-status' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Selecciona un estado' />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {ORDER_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='reason'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation='vertical' data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='order-override-reason'>Motivo</FieldLabel>
                <Textarea
                  id='order-override-reason'
                  aria-invalid={fieldState.invalid}
                  rows={3}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Volver
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? <Spinner /> : null}
              Cambiar estado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface OrderActionButtonsProps {
  orderId: string;
  actions: OrderActionOption[];
}

/**
 * Renders exactly the actions `availableActions` returned on the server; the UI
 * never decides with roles or status lists of its own.
 */
export function OrderActionButtons({ orderId, actions }: OrderActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const byAction = new Map<OrderAction, OrderActionOption>(
    actions.map((option) => [option.action, option]),
  );
  const markPaid = byAction.get('markOrderPaid');
  const complete = byAction.get('completeOrder');
  const blocked = markPaid?.disabledReason ?? null;

  function runPaid() {
    startTransition(async () => {
      await submitAction(() => markOrderPaid({ orderId }), 'Pedido marcado como pagado');
    });
  }

  function runComplete() {
    startTransition(async () => {
      await submitAction(() => completeOrder({ orderId }), 'Pedido completado');
    });
  }

  if (actions.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>Sin acciones disponibles para este pedido.</p>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-2'>
        {markPaid ? <ActionButton option={markPaid} pending={isPending} onClick={runPaid} /> : null}
        {complete ? (
          <ActionButton option={complete} pending={isPending} onClick={runComplete} />
        ) : null}
        {byAction.has('cancelOrder') ? <CancelOrderDialog orderId={orderId} /> : null}
        {byAction.has('overrideOrderStatus') ? <OverrideStatusDialog orderId={orderId} /> : null}
      </div>

      {blocked ? <p className='text-xs text-muted-foreground'>{blocked}</p> : null}
    </div>
  );
}
