import { Button } from '@/shared/components/button';
import type { CartDTO } from '../application/cart.types';
import { CartTotals } from './cart-totals';

export function CartSummary({ cart }: { cart: CartDTO }) {
  return (
    <aside className='flex h-fit flex-col gap-5 rounded-lg border border-neutral-200 p-5 lg:sticky lg:top-6'>
      <h2 className='text-lg font-semibold text-neutral-900'>Resumen</h2>

      <dl className='flex items-center justify-between text-sm'>
        <dt className='text-neutral-600'>Productos</dt>
        <dd className='font-medium text-neutral-900'>{cart.itemCount}</dd>
      </dl>

      <div className='flex flex-col gap-2 border-t border-neutral-200 pt-3'>
        <span className='text-sm text-neutral-600'>Subtotal</span>
        <CartTotals totals={cart.totals} exchanges={cart.exchanges} />
      </div>

      {cart.hasQuote ? (
        <p className='text-xs text-neutral-500'>No incluye productos por cotizar.</p>
      ) : null}

      <Button type='button' disabled className='w-full'>
        Continuar con la compra
      </Button>
    </aside>
  );
}
