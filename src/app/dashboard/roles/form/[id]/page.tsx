import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { roleParamsSchema } from '@/modules/roles/application/roles.validation';
import { RoleForm } from '@/modules/roles/components/role-form';
import {
  getRole,
  listPermissionOptions,
  listUserRoleIds,
} from '@/modules/roles/infrastructure/roles.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface RoleFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoleFormPage({ params }: RoleFormPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = roleParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.roles.edit)) {
    notFound();
  }

  if (!ctx.session) {
    notFound();
  }

  const [role, permissions, actorRoleIds] = await Promise.all([
    getRole(ctx, parsedParams.data.id),
    listPermissionOptions(ctx),
    listUserRoleIds(ctx, ctx.session.user.id),
  ]);

  if (!role) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar rol</h1>
      <RoleForm role={role} permissions={permissions} isOwnRole={actorRoleIds.includes(role.id)} />
    </div>
  );
}
