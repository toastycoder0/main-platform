import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { TagsTable } from '@/modules/tags/components/tags-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface TagsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.tags.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de etiquetas</h1>

      <ListToolbar searchLabel='Buscar etiquetas' searchPlaceholder='Buscar por nombre o slug…'>
        {ctx.permissions.has(PERMISSIONS.admin.tags.create) ? (
          <ListCreateButton href='/dashboard/tags/new'>Crear etiqueta</ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <TagsTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
