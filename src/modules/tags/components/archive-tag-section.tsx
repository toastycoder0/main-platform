'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveTag } from '../infrastructure/tags.action';

interface ArchiveTagSectionProps {
  tagId: string;
  tagName: string;
}

export function ArchiveTagSection({ tagId, tagName }: ArchiveTagSectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveTag({ id: tagId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar etiqueta</h2>
        <p className='text-xs text-muted-foreground'>
          La etiqueta se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar etiqueta'
          title={`Archivar ${tagName}?`}
          description='Esta acción oculta la etiqueta de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
