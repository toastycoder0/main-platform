'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveProductUnit } from '../infrastructure/product-units.action';

interface ArchiveProductUnitSectionProps {
  productUnitId: string;
  productUnitName: string;
}

export function ArchiveProductUnitSection({
  productUnitId,
  productUnitName,
}: ArchiveProductUnitSectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveProductUnit({ id: productUnitId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar unidad</h2>
        <p className='text-xs text-muted-foreground'>
          La unidad se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar unidad'
          title={`Archivar ${productUnitName}?`}
          description='Esta acción oculta la unidad de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
