'use client';

import { CalendarClockIcon } from 'lucide-react';
import { useProductSelection } from './product-selection-context';

export function ProductLeadTime() {
  const { view } = useProductSelection();
  const days = view?.variant.leadTimeDays ?? 0;

  if (days <= 0) {
    return null;
  }

  return (
    <div className='flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:p-4'>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
        <CalendarClockIcon className='size-5' aria-hidden='true' />
      </span>
      <div className='flex flex-col text-sm'>
        <span className='font-medium text-emerald-900'>Tiempo de envío</span>
        <span className='text-emerald-800'>
          Enviado a más tardar en {days} {days === 1 ? 'día hábil' : 'días hábiles'}
        </span>
      </div>
    </div>
  );
}
