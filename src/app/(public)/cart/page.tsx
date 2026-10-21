import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { CartSkeleton } from '@/modules/cart/components/cart-skeleton';
import { CartView } from '@/modules/cart/components/cart-view';

export const metadata: Metadata = { title: 'Carrito' };

export default async function CartPage() {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartView ctx={ctx} />
    </Suspense>
  );
}
