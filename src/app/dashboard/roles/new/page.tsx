import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { RoleForm } from '@/modules/roles/components/role-form';
import { listPermissionOptions } from '@/modules/roles/infrastructure/roles.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewRolePage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.roles.create)) {
    notFound();
  }

  const permissions = await listPermissionOptions(ctx);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear rol</h1>
      <RoleForm permissions={permissions} />
    </div>
  );
}
