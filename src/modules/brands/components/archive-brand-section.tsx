'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveBrand } from '../infrastructure/brands.action';

interface ArchiveBrandSectionProps {
  brandId: string;
  brandName: string;
}

export function ArchiveBrandSection({ brandId, brandName }: ArchiveBrandSectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveBrand({ id: brandId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar marca</h2>
        <p className='text-xs text-muted-foreground'>
          La marca se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar marca'
          title={`Archivar ${brandName}?`}
          description='Esta acción oculta la marca de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
