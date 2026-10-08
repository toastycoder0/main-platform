import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProfileNav } from '@/modules/users/components/profile/profile-nav';
import { getProfile } from '@/modules/users/infrastructure/users.query';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/avatar';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const profile = await getProfile(ctx, ctx.session.user.id);

  if (!profile) {
    redirect('/auth/login');
  }

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
      <div className='flex items-center gap-4'>
        <Avatar size='lg'>
          <AvatarImage src={profile.image ?? undefined} alt='' />
          <AvatarFallback className='text-base font-medium'>{initials}</AvatarFallback>
        </Avatar>

        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold'>Mi perfil</h1>
          <p className='text-sm text-muted-foreground'>
            {profile.firstName} {profile.lastName} · {profile.email}
          </p>
        </div>
      </div>

      <div className='flex flex-col gap-6 md:flex-row md:gap-8'>
        <aside className='md:w-52 md:shrink-0'>
          <ProfileNav />
        </aside>

        <div className='min-w-0 flex-1'>{children}</div>
      </div>
    </div>
  );
}
