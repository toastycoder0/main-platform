'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveExchangeRate } from '../infrastructure/exchange-rates.action';

interface ArchiveExchangeRateSectionProps {
  exchangeRateId: string;
  pair: string;
}

export function ArchiveExchangeRateSection({
  exchangeRateId,
  pair,
}: ArchiveExchangeRateSectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveExchangeRate({ id: exchangeRateId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar tipo de cambio</h2>
        <p className='text-xs text-muted-foreground'>
          El tipo de cambio se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar tipo de cambio'
          title={`Archivar ${pair}?`}
          description='Esta acción oculta el tipo de cambio de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
