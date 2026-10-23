'use client';

import { SlidersHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { ORDER_STATUSES } from '@/modules/checkout/application/checkout.constants';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import { Label } from '@/shared/components/label';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/components/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';
import { useIsMobile } from '@/shared/hooks/use-is-mobile';
import { ORDER_STATUS_LABELS } from '../application/orders.status';
import type { OrderStatus } from '../application/orders.types';
import { useOrdersParams } from './use-orders-params';

interface OrdersStatusFilterProps {
  counts: Record<OrderStatus, number>;
}

function StatusOptions({
  draft,
  counts,
  onToggle,
}: {
  draft: OrderStatus[];
  counts: Record<OrderStatus, number>;
  onToggle: (status: OrderStatus) => void;
}) {
  return (
    <div className='flex flex-col gap-1'>
      {ORDER_STATUSES.map((status) => {
        const id = `orders-filter-status-${status}`;

        return (
          <div key={status} className='flex items-center gap-2 rounded-md px-1 py-1.5'>
            <Checkbox
              id={id}
              checked={draft.includes(status)}
              onCheckedChange={() => onToggle(status)}
            />
            <Label htmlFor={id} className='flex-1 font-normal'>
              {ORDER_STATUS_LABELS[status]}
            </Label>
            <span className='text-xs tabular-nums text-muted-foreground'>{counts[status]}</span>
          </div>
        );
      })}
    </div>
  );
}

function FilterActions({
  onClear,
  onApply,
  disabled,
}: {
  onClear: () => void;
  onApply: () => void;
  disabled: boolean;
}) {
  return (
    <div className='flex items-center justify-between gap-2'>
      <Button type='button' variant='ghost' size='sm' onClick={onClear} disabled={disabled}>
        Limpiar
      </Button>
      <Button type='button' size='sm' onClick={onApply} disabled={disabled}>
        Aplicar
      </Button>
    </div>
  );
}

export function OrdersStatusFilter({ counts }: OrdersStatusFilterProps) {
  const isMobile = useIsMobile();
  const { params, setParams, isPending } = useOrdersParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OrderStatus[]>(params.status);

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (next) {
      setDraft(params.status);
    }
  }

  function toggle(status: OrderStatus) {
    setDraft((current) =>
      current.includes(status)
        ? current.filter((candidate) => candidate !== status)
        : [...current, status],
    );
  }

  function apply() {
    setParams({ status: draft.length > 0 ? draft : null, page: 1 });
    setOpen(false);
  }

  const trigger = (
    <Button
      type='button'
      variant='outline'
      className='w-full justify-between bg-white sm:w-auto'
      disabled={isPending}
    >
      <span className='flex items-center gap-2'>
        <SlidersHorizontalIcon />
        Estado
        {params.status.length > 0 ? ` (${params.status.length})` : null}
      </span>
    </Button>
  );

  const body = (
    <>
      <StatusOptions draft={draft} counts={counts} onToggle={toggle} />
      <FilterActions onClear={() => setDraft([])} onApply={apply} disabled={isPending} />
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side='bottom' className='max-h-[85vh] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>Filtrar por estado</SheetTitle>
          </SheetHeader>
          <div className='flex flex-col gap-4 px-4 pb-6'>{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align='start' className='w-64'>
        <PopoverHeader>
          <PopoverTitle>Estado</PopoverTitle>
        </PopoverHeader>
        {body}
      </PopoverContent>
    </Popover>
  );
}
