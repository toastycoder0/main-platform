import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { RolesTable } from '@/modules/roles/components/roles-table';
import { ListSkeleton } from '@/shared/components/list-skeleton';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { loadListParams } from '@/shared/list-params';

interface RolesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.roles.access)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Gestión de roles</h1>

      <ListToolbar searchLabel='Buscar roles' searchPlaceholder='Buscar por nombre o slug…' />

      <Suspense fallback={<ListSkeleton />}>
        <RolesTable params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
}
