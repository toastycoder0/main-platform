'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { buttonVariants } from '@/shared/components/button';
import { useNavbar } from './navbar';

interface NavbarCartProps {
  count?: number;
}

export function NavbarCart({ count = 0 }: NavbarCartProps) {
  const { register, unregister } = useNavbar();

  useEffect(() => {
    const cart = <CartButton count={count} />;
    register('cart', { desktop: cart, mobile: cart });
    return () => unregister('cart');
  }, [count, register, unregister]);

  return null;
}

function CartButton({ count }: { count: number }) {
  return (
    <Link
      href='/cart'
      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      aria-label={`Carrito${count > 0 ? `, ${count} producto${count !== 1 ? 's' : ''}` : ''}`}
    >
      <ShoppingCart className='size-5' />
      {count > 0 && (
        <span className='absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold leading-tight text-white'>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
