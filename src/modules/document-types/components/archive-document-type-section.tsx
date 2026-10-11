'use client';

import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import { DestructiveConfirm } from '@/shared/components/confirm-destructive';
import { archiveDocumentType } from '../infrastructure/document-types.action';

interface ArchiveDocumentTypeSectionProps {
  documentTypeId: string;
  documentTypeName: string;
}

export function ArchiveDocumentTypeSection({
  documentTypeId,
  documentTypeName,
}: ArchiveDocumentTypeSectionProps) {
  const [isPending, startTransition] = useTransition();

  function submitArchive() {
    startTransition(async () => {
      await submitAction(() => archiveDocumentType({ id: documentTypeId }));
    });
  }

  return (
    <section className='flex flex-col gap-4 rounded-md border border-destructive/30 p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='font-semibold'>Archivar tipo de documento</h2>
        <p className='text-xs text-muted-foreground'>
          El tipo de documento se ocultará del listado y no podrá usarse.
        </p>
      </div>

      <div className='flex gap-2'>
        <DestructiveConfirm
          label='Archivar tipo de documento'
          title={`Archivar ${documentTypeName}?`}
          description='Esta acción oculta el tipo de documento de forma permanente. No se puede deshacer.'
          confirmLabel='Archivar'
          busy={isPending}
          onConfirm={submitArchive}
        />
      </div>
    </section>
  );
}
