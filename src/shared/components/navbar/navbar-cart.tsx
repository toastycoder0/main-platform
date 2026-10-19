'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';

interface NavbarCartProps {
  count?: number;
  className?: string;
}

export function NavbarCart({ count = 0, className }: NavbarCartProps) {
  return (
    <Link
      href='/cart'
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), className)}
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
