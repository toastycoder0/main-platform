import type { RequestContext } from '@/infrastructure/context/types';
import { getCart } from '../infrastructure/cart.query';
import { CartEmpty } from './cart-empty';
import { CartItemRow } from './cart-item-row';
import { CartSummary } from './cart-summary';

export async function CartView({ ctx }: { ctx: RequestContext }) {
  const cart = await getCart(ctx);

  if (cart.lines.length === 0) {
    return <CartEmpty />;
  }

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
      <h1 className='text-2xl font-semibold text-neutral-900'>
        Carrito{' '}
        <span className='text-base font-normal text-neutral-500'>
          ({cart.itemCount} {cart.itemCount === 1 ? 'artículo' : 'artículos'})
        </span>
      </h1>

      <div className='grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start'>
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
