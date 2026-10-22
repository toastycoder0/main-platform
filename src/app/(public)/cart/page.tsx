import type { Metadata } from 'next';
import { CartLines } from '@/modules/cart/components/cart-lines';
import { CartContinue } from '@/modules/checkout/components/cart-continue';
import { CheckoutShell } from '@/modules/checkout/components/checkout-shell';
import { loadCheckoutStep } from '@/modules/checkout/infrastructure/checkout.guard';

export const metadata: Metadata = { title: 'Carrito' };

export default async function CartPage() {
  const { state } = await loadCheckoutStep('cart');

  return (
    <CheckoutShell step='cart' state={state}>
      <CartLines cart={state.cart} />
      {state.cart.lines.length === 0 ? null : <CartContinue state={state} />}
    </CheckoutShell>
  );
}
