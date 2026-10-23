'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SendIcon } from 'lucide-react';
import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { submitAction } from '@/shared/actions/submit-action';
import { Button } from '@/shared/components/button';
import { Field, FieldError, FieldLabel } from '@/shared/components/field';
import { Spinner } from '@/shared/components/spinner';
import { Textarea } from '@/shared/components/textarea';
import { NOTE_BODY_MAX } from '../application/orders.notes';
import type { OrderNoteDTO } from '../application/orders.types';
import { addOrderNote } from '../infrastructure/orders.notes.action';

function formatNoteDate(value: Date): string {
  return format(value, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

interface OrderNotesPanelProps {
  orderId: string;
  notes: OrderNoteDTO[];
}

/** Internal notes, management only: append-only, with no edit or delete. */
export function OrderNotesPanel({ orderId, notes }: OrderNotesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<{ body: string }>({ defaultValues: { body: '' } });
  const body = form.watch('body') ?? '';

  function onSubmit({ body: value }: { body: string }) {
    startTransition(async () => {
      const result = await submitAction(
        () => addOrderNote({ orderId, body: value }),
        'Nota agregada',
      );

      if (result.success) {
        form.reset({ body: '' });
      }
    });
  }

  return (
    <div className='flex flex-col gap-4'>
      <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-2'>
        <Controller
          name='body'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation='vertical' data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='order-note-body'>Nota interna</FieldLabel>
              <Textarea
                id='order-note-body'
                aria-invalid={fieldState.invalid}
                maxLength={NOTE_BODY_MAX}
                placeholder='Solo la gestión ve esta nota'
                rows={3}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>
            {body.length}/{NOTE_BODY_MAX}
          </span>
          <Button type='submit' size='sm' disabled={isPending || body.trim().length === 0}>
            {isPending ? <Spinner /> : <SendIcon />}
            Agregar nota
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Sin notas internas.</p>
      ) : (
        <ol className='flex flex-col gap-3'>
          {notes.map((note) => (
            <li key={note.id} className='flex flex-col gap-1 rounded-lg border p-3'>
              <p className='text-sm whitespace-pre-wrap'>{note.body}</p>
              <p className='text-xs text-muted-foreground'>
                {note.authorName ?? 'Sistema'} · {formatNoteDate(note.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
