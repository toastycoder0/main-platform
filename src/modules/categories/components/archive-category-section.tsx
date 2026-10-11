'use client';

import { Trash2Icon } from 'lucide-react';
import { useTransition } from 'react';
import { submitAction } from '@/shared/actions/submit-action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/alert-dialog';
import { Button } from '@/shared/components/button';
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type='button' variant='destructive' disabled={isPending}>
              <Trash2Icon />
              Archivar categoría
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archivar {categoryName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción oculta la categoría de forma permanente. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={submitArchive}>Archivar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
