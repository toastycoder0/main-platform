'use client';

import { Menu, Search, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { buttonVariants } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import { LogoLarge } from '@/shared/components/logo-large';
import { NavigationMenu, NavigationMenuList } from '@/shared/components/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';
import { NavLinks } from './category-dropdown';
import { MobileNavPanel } from './mobile-panel';
import type { NavLink } from './nav-link';
import { DesktopUserArea, MobileAuthArea } from './user-area';

export interface NavbarProps {
  isAuthenticated: boolean;
  userName: string | undefined;
  userLinks: NavLink[] | undefined;
  cartItemCount?: number;
  showCart?: boolean;
  navLinks: NavLink[] | undefined;
}

export function Navbar({
  isAuthenticated,
  userName,
  cartItemCount = 0,
  showCart = true,
  navLinks,
}: NavbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = searchRef.current?.value.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  };

  const searchBar = (
    <form
      onSubmit={submitSearch}
      className='group flex w-full rounded-md focus-within:ring-2 focus-within:ring-ring/50'
    >
      <Input
        ref={searchRef}
        type='text'
        placeholder='Buscar productos, categorías o marcas…'
        className='w-full bg-[#ECECED] rounded-r-none focus-visible:ring-0'
        aria-label='Buscar productos'
      />
      <button
        type='submit'
        tabIndex={-1}
        className='shrink-0 rounded-r-md border border-l-0 border-input bg-[#ECECED] px-3 text-neutral-400 group-focus-within:border-ring'
        aria-label='Ejecutar búsqueda'
      >
        <Search className='size-4' />
      </button>
    </form>
  );

  const logo = (
    <Link href='/' aria-label='Ir al inicio' className='shrink-0'>
      <LogoLarge className='h-8 w-auto' />
    </Link>
  );

  const cartButton = (
    <Link
      href='/cart'
      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      aria-label={`Carrito${cartItemCount > 0 ? `, ${cartItemCount} producto${cartItemCount !== 1 ? 's' : ''}` : ''}`}
    >
      <ShoppingCart className='size-5' />
      {cartItemCount > 0 && (
        <span className='absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold leading-tight text-white'>
          {cartItemCount > 99 ? '99+' : cartItemCount}
        </span>
      )}
    </Link>
  );

  return (
    <>
      <header className='sticky top-0 z-40 border-b border-neutral-200 bg-white'>
        <div className='mx-auto hidden max-w-360 items-center gap-3 px-4 md:px-6 pt-3 pb-1.5 md:flex'>
          <div className='flex-1'>{logo}</div>
          <div className='w-72 lg:w-xl shrink-0'>{searchBar}</div>

          <div className='flex flex-1 items-center justify-end gap-3'>
            <DesktopUserArea isAuthenticated={isAuthenticated} userName={userName} />
            {showCart && cartButton}
          </div>
        </div>

        {navLinks?.length && (
          <div className='mx-auto hidden max-w-7xl flex-wrap justify-center px-4 pb-1.5 md:flex'>
            <NavigationMenu className='max-w-max'>
              <NavigationMenuList>
                <NavLinks links={navLinks} />
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        )}

        <div className='flex items-center justify-end gap-1 px-4 py-3 md:hidden'>
          <div className='flex items-center gap-1'>
            {showCart && cartButton}
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

                <div className='flex-1 overflow-y-auto px-4 pt-16'>
                  {searchBar}

                  <MobileNavPanel navLinks={navLinks ?? []} />
                </div>

                <div className='flex flex-col gap-2 border-t border-neutral-100 p-4'>
                  <MobileAuthArea isAuthenticated={isAuthenticated} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className='fixed top-3 left-4 z-60 md:hidden'>{logo}</div>
    </>
  );
}
