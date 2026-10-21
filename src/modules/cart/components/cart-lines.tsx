import type { CartDTO } from '../application/cart.types';
import { CartClearButton } from './cart-clear-button';
import { CartEmpty } from './cart-empty';
import { CartItemRow } from './cart-item-row';

interface CartLinesProps {
  cart: CartDTO;
}

export function CartLines({ cart }: CartLinesProps) {
  if (cart.lines.length === 0) {
    return <CartEmpty />;
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-base font-semibold text-neutral-900'>Productos</h2>
        <CartClearButton />
      </div>

      <ul className='divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4'>
        {cart.lines.map((line) => (
          <CartItemRow key={line.id} line={line} />
        ))}
      </ul>
    </div>
  );
}
