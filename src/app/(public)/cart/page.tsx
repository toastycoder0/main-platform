import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { CheckoutUser } from '@/modules/cart/application/checkout.types';
import { CartActions } from '@/modules/cart/components/cart-actions';
import { CartCheckout } from '@/modules/cart/components/cart-checkout';
import { CartFlow } from '@/modules/cart/components/cart-flow';
import { CartLines } from '@/modules/cart/components/cart-lines';
import { CartSummary } from '@/modules/cart/components/cart-summary';
import { getCart } from '@/modules/cart/infrastructure/cart.query';
import {
  listUserAddresses,
  listUsers,
  listUserTaxProfiles,
} from '@/modules/users/infrastructure/users.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

export const metadata: Metadata = { title: 'Carrito' };

export default async function CartPage() {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const cart = await getCart(ctx);
  const sessionUser: CheckoutUser = {
    id: ctx.session.user.id,
    name: ctx.session.user.name,
    email: ctx.session.user.email,
  };
  const canCreateForOther = ctx.permissions.has(PERMISSIONS.orders.createForOther);
  const canReserve = ctx.permissions.has(PERMISSIONS.admin.access);

  const [addresses, taxProfiles, userPage] = await Promise.all([
    listUserAddresses(ctx, sessionUser.id),
    listUserTaxProfiles(ctx, sessionUser.id),
    canCreateForOther ? listUsers(ctx, { q: null, page: 1, pageSize: 50 }) : Promise.resolve(null),
  ]);

  const ownerOptions: CheckoutUser[] =
    userPage?.items.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    })) ?? [];

  if (!ownerOptions.some((user) => user.id === sessionUser.id)) {
    ownerOptions.unshift(sessionUser);
  }

  return (
    <CartFlow
      itemCount={cart.itemCount}
      isEmpty={cart.lines.length === 0}
      cartContent={
        <div className='flex flex-col gap-6'>
          <CartLines cart={cart} />
          {cart.lines.length === 0 ? null : <CartActions cart={cart} />}
        </div>
      }
      checkoutContent={
        <CartCheckout
          cart={cart}
          users={canCreateForOther ? ownerOptions : []}
          sessionUser={sessionUser}
          addresses={addresses}
          taxProfiles={taxProfiles}
          canCreateForOther={canCreateForOther}
          canReserve={canReserve}
        />
      }
      summary={<CartSummary cart={cart} />}
    />
  );
}
