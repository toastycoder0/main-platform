import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { listPermissionOptions } from '@/modules/roles/infrastructure/roles.query';
import { userParamsSchema } from '@/modules/users/application/users.validation';
import { UserAccessPanel } from '@/modules/users/components/user-access-panel';
import { UserForm } from '@/modules/users/components/user-form';
import { getUser, listRoleOptions } from '@/modules/users/infrastructure/users.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface UserFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserFormPage({ params }: UserFormPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = userParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.users.edit)) {
    notFound();
  }

  const [user, roleOptions, permissionOptions] = await Promise.all([
    getUser(ctx, parsedParams.data.id),
    listRoleOptions(ctx),
    listPermissionOptions(ctx),
  ]);

  if (!user) {
    notFound();
  }

  const isSelf = ctx.session?.user.id === user.id;

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar usuario</h1>
      <UserForm user={user} roleOptions={roleOptions} permissionOptions={permissionOptions} />
      {isSelf ? null : (
        <UserAccessPanel
          user={user}
          canBan={ctx.permissions.has(PERMISSIONS.admin.users.ban)}
          canResetPassword={ctx.permissions.has(PERMISSIONS.admin.users.edit)}
          canDelete={ctx.permissions.has(PERMISSIONS.admin.users.delete)}
        />
      )}
    </div>
  );
}
