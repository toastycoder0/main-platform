import { redirect } from 'next/navigation';
import { createLoader, parseAsStringEnum } from 'nuqs/server';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { ProfileAddresses } from '@/modules/users/components/profile/profile-addresses';
import { ProfileGeneral } from '@/modules/users/components/profile/profile-general';
import { type AccountTab, ProfileTabs } from '@/modules/users/components/profile/profile-tabs';
import { ProfileTaxProfiles } from '@/modules/users/components/profile/profile-tax-profiles';
import {
  getProfile,
  listUserAddresses,
  listUserTaxProfiles,
} from '@/modules/users/infrastructure/users.query';
import { Skeleton } from '@/shared/components/skeleton';

const tabParam = parseAsStringEnum<AccountTab>(['general', 'addresses', 'billing']).withDefault(
  'general',
);

const loadAccountParams = createLoader({ tab: tabParam });

function ProfileSectionSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-4'>
      <span className='sr-only'>Cargando perfil…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className='h-16 w-full' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-9 w-40' />
      </div>
    </div>
  );
}

interface AccountPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const { tab } = loadAccountParams(await searchParams);
  const userId = ctx.session.user.id;

  const [profile, addresses, taxProfiles] = await Promise.all([
    getProfile(ctx, userId),
    listUserAddresses(ctx, userId),
    listUserTaxProfiles(ctx, userId),
  ]);

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold'>Mi perfil</h1>
        <p className='text-sm text-muted-foreground'>
          {profile.firstName} {profile.lastName} · {profile.email}
        </p>
      </div>

      <ProfileTabs tab={tab} />

      <Suspense key={tab} fallback={<ProfileSectionSkeleton />}>
        {tab === 'addresses' ? (
          <ProfileAddresses addresses={addresses} />
        ) : tab === 'billing' ? (
          <ProfileTaxProfiles taxProfiles={taxProfiles} />
        ) : (
          <ProfileGeneral profile={profile} />
        )}
      </Suspense>
    </>
  );
}
