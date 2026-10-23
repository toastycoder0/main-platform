'use client';

import { SaveIcon } from 'lucide-react';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { ControlledMultiFileUploader } from '@/shared/components/file-uploader';
import { Spinner } from '@/shared/components/spinner';
import { attachOrderEvidence } from '../infrastructure/orders.evidence.action';

interface OrderEvidencePanelProps {
  orderId: string;
  /** Persisted URLs of the payment evidence. */
  files: string[];
  canManage: boolean;
}

export function OrderEvidencePanel({ orderId, files, canManage }: OrderEvidencePanelProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<{ refs: string[] }>({ defaultValues: { refs: files } });

  function onSubmit({ refs }: { refs: string[] }) {
    startTransition(async () => {
      const result = await submitAction(
        () => attachOrderEvidence({ orderId, scope: 'paymentEvidence', refs }),
        'Comprobantes guardados',
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
        scope='paymentEvidence'
        readOnly={!canManage}
        description={canManage ? 'PDF o imágenes, hasta 5 archivos.' : undefined}
      />

      {canManage ? (
        <Button
          type='submit'
          size='sm'
          className='w-fit'
          disabled={isPending || !form.formState.isDirty}
        >
          {isPending ? <Spinner /> : <SaveIcon />}
          Guardar comprobantes
        </Button>
      ) : null}
    </form>
  );
}
