'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveCategory } from '../infrastructure/categories.action';

interface ArchiveCategorySectionProps {
  categoryId: string;
  categoryName: string;
}

export function ArchiveCategorySection({ categoryId, categoryName }: ArchiveCategorySectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveCategory({ id: categoryId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar categoría</h2>
        <p className='text-xs text-muted-foreground'>
          La categoría se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar categoría'
          title={`Archivar ${categoryName}?`}
          description='Esta acción oculta la categoría de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
