'use client';

import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/shared/components/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';
import { cn } from '@/shared/utils/cn';

interface NavbarMobileMenuProps {
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function NavbarMobileMenu({ children, actions, footer, className }: NavbarMobileMenuProps) {
  return (
    <div
      data-slot='navbar-mobile'
      className={cn('flex items-center justify-end gap-1 px-4 py-3 md:hidden', className)}
    >
      {actions}

      <Sheet>
        <SheetTrigger asChild>
          <button
            type='button'
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            aria-label='Abrir menú'
          >
            <Menu className='size-5' />
          </button>
        </SheetTrigger>
        <SheetContent side='left' className='flex w-full max-w-full flex-col p-0'>
          <SheetHeader className='sr-only'>
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>

          <div className='flex-1 overflow-y-auto px-4 pt-16'>{children}</div>

          {footer ? (
            <div className='flex flex-col gap-2 border-t border-neutral-100 p-4'>{footer}</div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
