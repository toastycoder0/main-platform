'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveCurrency } from '../infrastructure/currencies.action';

interface ArchiveCurrencySectionProps {
  currencyCode: string;
  currencyName: string;
}

export function ArchiveCurrencySection({
  currencyCode,
  currencyName,
}: ArchiveCurrencySectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveCurrency({ code: currencyCode }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar moneda</h2>
        <p className='text-xs text-muted-foreground'>
          La moneda se ocultará del listado y no podrá usarse. Las monedas base no pueden
          eliminarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar moneda'
          title={`Archivar ${currencyName}?`}
          description='Esta acción oculta la moneda de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
