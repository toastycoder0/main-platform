'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeftIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/shared/components/item';
import { ok } from '@/shared/result';
import type { CellStockDetail } from '../application/warehouse.map';
import type { CellOccupancy } from '../application/warehouse.occupancy';
import {
  type CellCapacityFormSchema,
  cellCapacityFormSchema,
} from '../application/warehouse.validation';
import { updateCellCapacity } from '../infrastructure/warehouse.action';
import { OccupancyBar } from './occupancy-bar';

interface WarehouseCellPanelProps {
  cellId: string;
  cellCode: string;
  stockCount: number;
  occupancy: CellOccupancy;
  details: CellStockDetail[];
  canEdit: boolean;
  movementHref: string;
  onClose: () => void;
}

interface CapacityEditorProps {
  cellId: string;
  capacity: number | null;
}

function CapacityEditor({ cellId, capacity }: CapacityEditorProps) {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(cellCapacityFormSchema),
    defaultValues: { capacity: capacity != null ? String(capacity) : '' },
  });

  // Revalidation after a save updates the `capacity` prop; keep the form in
  // sync with server truth instead of writing values locally.
  useEffect(() => {
    reset({ capacity: capacity != null ? String(capacity) : '' });
  }, [capacity, reset]);

  function onSubmit(values: CellCapacityFormSchema) {
    startTransition(async () => {
      setMessage('');

      const result = await submitAction(async () => {
        const response = await updateCellCapacity({ id: cellId, capacity: values.capacity });
        return response.success ? ok(undefined) : response;
      });

      if (result.success) {
        setMessage('Capacidad actualizada');
      }
    });
  }

  return (
    <Field data-invalid={Boolean(errors.capacity)}>
      <FieldLabel htmlFor='cell-capacity'>Capacidad (uds)</FieldLabel>

      <form className='flex gap-2' noValidate onSubmit={handleSubmit(onSubmit)}>
        <Controller
          control={control}
          name='capacity'
          render={({ field, fieldState }) => (
            <Input
              {...field}
              aria-invalid={fieldState.invalid}
              className='w-full text-sm tabular-nums'
              id='cell-capacity'
              min={0.0001}
              onChange={(event) => {
                setMessage('');
                field.onChange(event);
              }}
              placeholder='Sin límite'
              step='any'
              type='number'
            />
          )}
        />
        <Button
          className='shrink-0 h-9'
          disabled={isPending}
          size='sm'
          type='submit'
          variant='outline'
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>

      {errors.capacity ? <FieldError errors={[errors.capacity]} /> : null}
      {message ? <FieldDescription className='text-green-600'>{message}</FieldDescription> : null}
      <FieldDescription>Dejar vacío quita la capacidad definida.</FieldDescription>
    </Field>
  );
}

export function WarehouseCellPanel({
  cellId,
  cellCode,
  stockCount,
  occupancy,
  details,
  canEdit,
  movementHref,
  onClose,
}: WarehouseCellPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <aside
      aria-label={`Detalle de la celda ${cellCode}`}
      className='flex flex-1 flex-col overflow-hidden'
    >
      <div className='flex items-center justify-between border-b border-neutral-100 px-4 py-3'>
        <div className='min-w-0 flex-1'>
          <h3 className='truncate text-sm font-semibold text-neutral-900'>{cellCode}</h3>
          <p className='text-xs text-neutral-500'>
            {stockCount} lote{stockCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          aria-label='Cerrar panel'
          className='ml-2'
          onClick={onClose}
          ref={closeButtonRef}
          size='icon-sm'
          type='button'
          variant='ghost'
        >
          <XIcon />
        </Button>
      </div>

      <div className='space-y-3 border-b border-neutral-100 px-4 py-3'>
        <div>
          <p className='mb-1 text-xs font-medium text-neutral-500'>Ocupación</p>
          <OccupancyBar
            alwaysShowBar
            labelClassName='text-[10px]'
            occupancy={occupancy}
            trackClassName='bg-neutral-500'
          />
          <p className='mt-1 text-xs text-neutral-400'>
            {occupancy.percentage !== null
              ? occupancy.isOverCapacity
                ? `Sobrecapacidad: ${occupancy.total}/${occupancy.capacity} uds`
                : `${occupancy.total}/${occupancy.capacity} uds`
              : `Sin capacidad · ${occupancy.total} uds en total`}
          </p>
        </div>

        {canEdit ? <CapacityEditor capacity={occupancy.capacity} cellId={cellId} /> : null}
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-3'>
        {details.length === 0 ? (
          <p className='text-sm text-neutral-400'>Sin stock asignado</p>
        ) : (
          <ItemGroup className='gap-2'>
            {details.map((detail) => (
              <Item asChild key={detail.lotId} size='sm' variant='muted'>
                <li>
                  <ItemContent>
                    <ItemTitle>{detail.productTitle}</ItemTitle>
                    <ItemDescription>{detail.itemTitle}</ItemDescription>
                    <code className='mt-0.5 block text-xs text-neutral-400'>{detail.lotCode}</code>
                  </ItemContent>
                  <ItemActions>
                    <Badge className='shrink-0'>{detail.quantity} uds</Badge>
                  </ItemActions>
                </li>
              </Item>
            ))}
          </ItemGroup>
        )}
      </div>

      <div className='border-t border-neutral-100 p-3'>
        <Button asChild className='w-full' size='sm' variant='outline'>
          <Link href={movementHref}>
            <ArrowRightLeftIcon className='mr-2 size-4' />
            Registrar movimiento
          </Link>
        </Button>
      </div>
    </aside>
  );
}
