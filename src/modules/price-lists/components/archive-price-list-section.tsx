'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archivePriceList } from '../infrastructure/price-lists.action';

interface ArchivePriceListSectionProps {
  priceListId: string;
  priceListName: string;
}

export function ArchivePriceListSection({
  priceListId,
  priceListName,
}: ArchivePriceListSectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archivePriceList({ id: priceListId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar lista de precios</h2>
        <p className='text-xs text-muted-foreground'>
          La lista se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar lista'
          title={`Archivar ${priceListName}?`}
          description='Esta acción oculta la lista de precios de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
