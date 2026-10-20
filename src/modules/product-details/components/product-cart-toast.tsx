import { toast } from 'sonner';
import { formatCurrency } from '@/shared/utils/format-currency';
import type { AddToCartPreviewDTO, CartLinePreviewDTO } from '../application/product-details.types';

function describePrice(line: CartLinePreviewDTO): string {
  return line.price.kind === 'priced'
    ? formatCurrency(line.price.totalAmount, line.currency)
    : 'Precio por cotizar';
}

function CartToastLine({ line }: { line: CartLinePreviewDTO }) {
  return (
    <li className='flex flex-col'>
      <span className='font-medium'>
        {line.quantity}
        {line.unit ? ` ${line.unit}` : ' ×'} · {line.productTitle} ({line.variantTitle})
      </span>
      {line.fields.length > 0 ? (
        <span className='text-xs opacity-80'>
          {line.fields.map((field) => `${field.label}: ${field.value}`).join(' · ')}
        </span>
      ) : null}
      <span className='text-xs opacity-80'>{describePrice(line)}</span>
    </li>
  );
}

export function showCartToast({ lines }: AddToCartPreviewDTO) {
  toast.success(
    lines.length === 1 ? 'Producto añadido al carrito' : 'Productos añadidos al carrito',
    {
      description: (
        <ul className='mt-1 flex flex-col gap-1.5'>
          {lines.map((line) => (
            <CartToastLine key={`${line.productTitle}:${line.variantTitle}`} line={line} />
          ))}
        </ul>
      ),
    },
  );
}
