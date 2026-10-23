'use client';

import { SaveIcon } from 'lucide-react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { ControlledMultiFileUploader } from '@/shared/components/file-uploader';
import { Spinner } from '@/shared/components/spinner';
import type { EvidenceScope } from '../application/orders.evidence';
import { attachOrderEvidence } from '../infrastructure/orders.evidence.action';

interface OrderEvidencePanelProps {
  orderId: string;
  /** Persisted URLs of the evidence scope. */
  files: string[];
  canManage: boolean;
  scope?: EvidenceScope;
  description?: string;
}

export function OrderEvidencePanel({
  orderId,
  files,
  canManage,
  scope = 'paymentEvidence',
  description,
}: OrderEvidencePanelProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<{ refs: string[] }>({ defaultValues: { refs: files } });

  function onSubmit({ refs }: { refs: string[] }) {
    startTransition(async () => {
      const result = await submitAction(
        () => attachOrderEvidence({ orderId, scope, refs }),
        'Evidencia guardada',
      );

      if (result.success) {
        form.reset({ refs });
      }
    });
  }

  if (!canManage && files.length === 0) {
    return <p className='text-sm text-muted-foreground'>Sin comprobantes.</p>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-3'>
      <ControlledMultiFileUploader
        control={form.control}
        name='refs'
        entity='order'
        scope={scope}
        readOnly={!canManage}
        description={canManage ? (description ?? 'PDF o imágenes, hasta 5 archivos.') : undefined}
      />

      {canManage ? (
        <Button
          type='submit'
          size='sm'
          className='w-fit'
          disabled={isPending || !form.formState.isDirty}
        >
          {isPending ? <Spinner /> : <SaveIcon />}
          Guardar evidencia
        </Button>
      ) : null}
    </form>
  );
}
