import type { RequestContext } from '@/infrastructure/context/types';
import { getCart } from '../infrastructure/cart.query';
import { CartClearButton } from './cart-clear-button';
import { CartEmpty } from './cart-empty';
import { CartItemRow } from './cart-item-row';
import { CartSummary } from './cart-summary';

export async function CartView({ ctx }: { ctx: RequestContext }) {
  const cart = await getCart(ctx);

  if (cart.lines.length === 0) {
    return (
      <div className='mx-auto w-full max-w-7xl'>
        <CartEmpty />
      </div>
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
      <div className='flex items-start justify-between gap-3'>
        <h1 className='text-2xl font-semibold text-neutral-900'>
          Carrito{' '}
          <span className='text-base font-normal text-neutral-500'>
            ({cart.itemCount} {cart.itemCount === 1 ? 'artículo' : 'artículos'})
          </span>
        </h1>
        <CartClearButton />
      </div>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start lg:gap-8'>
        <ul className='divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4'>
          {cart.lines.map((line) => (
            <CartItemRow key={line.id} line={line} />
          ))}
        </ul>

        <CartSummary cart={cart} />
      </div>
    </div>
  );
}
