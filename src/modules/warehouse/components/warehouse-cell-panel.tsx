'use client';

import { ArrowRightLeftIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import { ok } from '@/shared/result';
import type { CellStockDetail } from '../application/warehouse.map';
import type { CellOccupancy } from '../application/warehouse.occupancy';
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

interface ParsedCapacity {
  capacity: number | null;
  error: string | null;
}

function parseCapacity(value: string): ParsedCapacity {
  const trimmed = value.trim();

  if (trimmed === '') {
    return { capacity: null, error: null };
  }

  const capacity = Number(trimmed);

  if (!Number.isFinite(capacity) || capacity < 0) {
    return { capacity: null, error: 'Ingresa un número mayor o igual a 0' };
  }

  return { capacity, error: null };
}

function CapacityEditor({ cellId, capacity }: CapacityEditorProps) {
  const [capacityValue, setCapacityValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [capacityMessage, setCapacityMessage] = useState('');
  const [capacityError, setCapacityError] = useState('');

  useEffect(() => {
    setCapacityValue(capacity != null ? String(capacity) : '');
    setCapacityMessage('');
    setCapacityError('');
  }, [capacity]);

  async function handleSaveCapacity() {
    const parsed = parseCapacity(capacityValue);

    if (parsed.error) {
      setCapacityError(parsed.error);
      return;
    }

    setSaving(true);
    setCapacityMessage('');
    setCapacityError('');

    const result = await submitAction(async () => {
      const response = await updateCellCapacity({ id: cellId, capacity: parsed.capacity });
      return response.success ? ok(undefined) : response;
    });

    setSaving(false);

    if (result.success) {
      setCapacityValue(parsed.capacity === null ? '' : String(parsed.capacity));
      setCapacityMessage('Capacidad actualizada');
    } else {
      setCapacityError(result.error);
    }
  }

  return (
    <div>
      <p className='mb-1 text-xs font-medium text-neutral-500'>Capacidad (uds)</p>
      <div className='flex gap-2'>
        <Input
          aria-label='Capacidad (uds)'
          className='w-full text-sm tabular-nums'
          id='cell-capacity'
          min={0}
          onChange={(event) => {
            setCapacityValue(event.target.value);
            setCapacityMessage('');
            setCapacityError('');
          }}
          placeholder='Sin límite'
          step={1}
          type='number'
          value={capacityValue}
        />
        <Button
          className='shrink-0'
          disabled={saving}
          onClick={handleSaveCapacity}
          size='sm'
          type='button'
          variant='outline'
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
      {capacityError ? <p className='mt-1 text-xs text-red-600'>{capacityError}</p> : null}
      {capacityMessage ? <p className='mt-1 text-xs text-green-600'>{capacityMessage}</p> : null}
      <p className='mt-1 text-[11px] text-neutral-400'>Dejar vacío quita la capacidad definida.</p>
    </div>
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
        <button
          aria-label='Cerrar panel'
          className='ml-2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600'
          onClick={onClose}
          ref={closeButtonRef}
          type='button'
        >
          <XIcon className='size-4' />
        </button>
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
          <ul className='space-y-2'>
            {details.map((detail) => (
              <li
                className='rounded-md border border-neutral-100 bg-neutral-50 p-2.5'
                key={detail.lotId}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-neutral-800'>
                      {detail.productTitle}
                    </p>
                    <p className='truncate text-xs text-neutral-500'>{detail.itemTitle}</p>
                    <code className='mt-0.5 block text-xs text-neutral-400'>{detail.lotCode}</code>
                  </div>
                  <Badge className='shrink-0'>{detail.quantity} uds</Badge>
                </div>
              </li>
            ))}
          </ul>
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
