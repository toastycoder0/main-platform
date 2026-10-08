import { redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { AccountAddressesForm } from '@/modules/users/components/profile/account-addresses-form';
import { listUserAddresses } from '@/modules/users/infrastructure/users.query';

export default async function AccountAddressesPage() {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const addresses = await listUserAddresses(ctx, ctx.session.user.id);

  return <AccountAddressesForm addresses={addresses} />;
}
