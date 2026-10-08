import { redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { AccountTaxProfilesForm } from '@/modules/users/components/profile/account-tax-profiles-form';
import { listUserTaxProfiles } from '@/modules/users/infrastructure/users.query';

export default async function AccountBillingPage() {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const taxProfiles = await listUserTaxProfiles(ctx, ctx.session.user.id);

  return <AccountTaxProfilesForm taxProfiles={taxProfiles} />;
}
