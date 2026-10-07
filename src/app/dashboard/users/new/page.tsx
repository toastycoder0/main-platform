import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { listPermissionOptions } from '@/modules/roles/infrastructure/roles.query';
import { UserForm } from '@/modules/users/components/user-form';
import { listRoleOptions } from '@/modules/users/infrastructure/users.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewUserPage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.users.create)) {
    notFound();
  }

  const [roleOptions, permissionOptions] = await Promise.all([
    listRoleOptions(ctx),
    listPermissionOptions(ctx),
  ]);

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear usuario</h1>
      <UserForm roleOptions={roleOptions} permissionOptions={permissionOptions} />
    </div>
  );
}
