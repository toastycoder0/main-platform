import { redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProfileGeneral } from '@/modules/users/components/profile/profile-general';
import { getProfile } from '@/modules/users/infrastructure/users.query';

export default async function AccountPage() {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const profile = await getProfile(ctx, ctx.session.user.id);

  if (!profile) {
    redirect('/auth/login');
  }

  return <ProfileGeneral profile={profile} />;
}
