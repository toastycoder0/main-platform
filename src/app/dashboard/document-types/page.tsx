import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { DocumentTypesTable } from '@/modules/document-types/components/document-types-table';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list/list-params';

interface DocumentTypesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DocumentTypesPage({ searchParams }: DocumentTypesPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.documentTypes.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de tipos de documento</h1>

      <ListToolbar
        searchLabel='Buscar tipos de documento'
        searchPlaceholder='Buscar por nombre o slug…'
      >
        {ctx.permissions.has(PERMISSIONS.admin.documentTypes.create) ? (
          <ListCreateButton href='/dashboard/document-types/new'>
            Crear tipo de documento
          </ListCreateButton>
        ) : null}
      </ListToolbar>

      <Suspense fallback={<ListSkeleton />}>
        <DocumentTypesTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
