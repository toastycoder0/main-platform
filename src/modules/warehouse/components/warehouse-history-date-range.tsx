'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/shared/components/button';
import { Calendar } from '@/shared/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/popover';
import { cn } from '@/shared/utils/cn';

interface WarehouseHistoryDateRangeProps {
  id: string;
  from: string | null;
  to: string | null;
  onChange: (range: { from: string | null; to: string | null }) => void;
}

function toDate(value: string | null): Date | undefined {
  return value ? parseISO(value) : undefined;
}

function toISO(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function formatDate(value: Date): string {
  return format(value, 'dd MMM yyyy', { locale: es });
}

function rangeLabel(from: Date | undefined, to: Date | undefined): string {
  if (from && to && from.getTime() !== to.getTime()) {
    return `${formatDate(from)} – ${formatDate(to)}`;
  }

  if (from) {
    return `Desde ${formatDate(from)}`;
  }

  if (to) {
    return `Hasta ${formatDate(to)}`;
  }

  return 'Cualquier fecha';
}

export function WarehouseHistoryDateRange({
  id,
  from,
  to,
  onChange,
}: WarehouseHistoryDateRangeProps) {
  const [open, setOpen] = useState(false);
  const fromDate = toDate(from);
  const toDateValue = toDate(to);
  const hasValue = Boolean(fromDate || toDateValue);
  const selected: DateRange | undefined =
    fromDate || toDateValue ? { from: fromDate, to: toDateValue } : undefined;

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? toISO(range.from) : null,
      to: range?.to ? toISO(range.to) : null,
    });

    if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) {
      setOpen(false);
    }
  }

  return (
    <div className='flex items-center gap-1'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              'min-w-0 flex-1 justify-start font-normal',
              !hasValue && 'text-muted-foreground',
            )}
            id={id}
            type='button'
            variant='outline'
          >
            <CalendarIcon />
            <span className='truncate'>{rangeLabel(fromDate, toDateValue)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align='start' className='pointer-events-auto w-auto p-0'>
          <Calendar
            locale={es}
            mode='range'
            numberOfMonths={1}
            onSelect={handleSelect}
            selected={selected}
          />
        </PopoverContent>
      </Popover>

      {hasValue ? (
        <Button
          aria-label='Limpiar fechas'
          onClick={() => onChange({ from: null, to: null })}
          size='icon-sm'
          type='button'
          variant='ghost'
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
