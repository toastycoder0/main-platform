'use client';

import { Menu, Search, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { SignOutButton } from '@/modules/auth/components/sign-out-button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/accordion';
import { Avatar, AvatarFallback } from '@/shared/components/avatar';
import { buttonVariants } from '@/shared/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { Input } from '@/shared/components/input';
import { LogoLarge } from '@/shared/components/logo-large';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/shared/components/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';
import { cn } from '@/shared/utils/cn';

export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
  icon?: ReactNode;
}

export interface NavbarProps {
  isAuthenticated: boolean;
  userName: string | undefined;
  userLinks: NavLink[] | undefined;
  cartItemCount?: number;
  showCart?: boolean;
  navLinks: NavLink[] | undefined;
}

const DEPTH_CLASSES: Record<number, string> = {
  0: 'font-medium',
  1: 'ml-3',
  2: 'ml-6',
  3: 'ml-9',
  4: 'ml-12',
  5: 'ml-16',
  6: 'ml-20',
};

function renderSubLinks(links: NavLink[], depth = 0) {
  const indent = DEPTH_CLASSES[depth] ?? 'ml-20';

  return links.map((link) => (
    <li key={link.href} className='break-inside-avoid'>
      <NavigationMenuLink href={link.href} className={indent}>
        {link.label}
      </NavigationMenuLink>
      {link.children?.length && (
        <ul className='mt-1'>{renderSubLinks(link.children, depth + 1)}</ul>
      )}
    </li>
  ));
}

function CategoryDropdownContent({ links }: { links: NavLink[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [cols, setCols] = useState(1);
  const MAX_COLS = 2;

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    if (el.scrollHeight > el.clientHeight && cols < MAX_COLS) {
      setCols(cols + 1);
    }
  }, [cols]);

  useLayoutEffect(() => {
    const onResize = () => setCols(1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const COL_CLASS: Record<number, string> = {
    1: '',
    2: 'columns-2',
  };

  return (
    <ul
      ref={listRef}
      className={cn(
        'w-max min-w-56 max-w-2xl p-2 max-h-[calc(100dvh-8rem)] overflow-y-auto space-y-1 rounded-xl',
        cols > 1 && 'gap-8',
        COL_CLASS[cols],
      )}
    >
      {renderSubLinks(links)}
    </ul>
  );
}

function renderNavLinks(links: NavLink[]) {
  return links.map((link) =>
    link.children?.length ? (
      <NavigationMenuItem key={link.href}>
        <NavigationMenuTrigger>{link.label}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <CategoryDropdownContent links={link.children} />
        </NavigationMenuContent>
      </NavigationMenuItem>
    ) : (
      <NavigationMenuItem key={link.href}>
        <NavigationMenuLink href={link.href} className={navigationMenuTriggerStyle()}>
          {link.label}
        </NavigationMenuLink>
      </NavigationMenuItem>
    ),
  );
}

function renderMobileLinks(links: NavLink[]) {
  return links.map((link) =>
    link.children?.length ? (
      <AccordionItem key={link.href} value={link.href}>
        <AccordionTrigger className='text-sm text-neutral-700'>{link.label}</AccordionTrigger>
        <AccordionContent>
          <div className='ml-3 flex flex-col gap-1 border-l border-neutral-100 pl-3'>
            {renderMobileSubLinks(link.children)}
          </div>
        </AccordionContent>
      </AccordionItem>
    ) : (
      <Link
        key={link.href}
        href={link.href}
        className='block rounded-md px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100'
      >
        {link.label}
      </Link>
    ),
  );
}

function renderMobileSubLinks(links: NavLink[]) {
  return links.map((link) =>
    link.children?.length ? (
      <Accordion key={link.href} type='multiple' className='w-full'>
        <AccordionItem value={link.href}>
          <AccordionTrigger className='text-sm text-neutral-700 py-2'>
            {link.label}
          </AccordionTrigger>
          <AccordionContent>
            <div className='ml-3 flex flex-col gap-1 border-l border-neutral-100 pl-3'>
              {renderMobileSubLinks(link.children)}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ) : (
      <Link
        key={link.href}
        href={link.href}
        className='block rounded-md px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100'
      >
        {link.label}
      </Link>
    ),
  );
}

interface DesktopUserAreaProps {
  isAuthenticated: boolean;
  userName: string | undefined;
}

function DesktopUserArea({ isAuthenticated, userName }: DesktopUserAreaProps) {
  if (!isAuthenticated) {
    return (
      <Link href='/auth/login' className={navigationMenuTriggerStyle()}>
        Iniciar sesión
      </Link>
    );
  }

  const userInitial = userName?.charAt(0).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className='flex items-center gap-2 rounded-md p-1.5 text-sm font-medium outline-none transition-all hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
          aria-label='Menú de usuario'
        >
          <Avatar size='sm'>
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <span className='text-sm font-medium'>{userName || 'Usuario'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem asChild>
          <Link href='/profile'>Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className='w-full'>
          <SignOutButton aria-label='Cerrar sesión'>Cerrar sesión</SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface MobileAuthAreaProps {
  isAuthenticated: boolean;
}

function MobileAuthArea({ isAuthenticated }: MobileAuthAreaProps) {
  if (!isAuthenticated) {
    return (
      <Link
        href='/auth/login'
        className='flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted'
      >
        Iniciar sesión
      </Link>
    );
  }

  return (
    <>
      <Link href='/profile' className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Perfil
      </Link>
      <SignOutButton className={buttonVariants()}>Cerrar sesión</SignOutButton>
    </>
  );
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

  const submitSearch = (e: React.FormEvent) => {
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
              <NavigationMenuList>{renderNavLinks(navLinks)}</NavigationMenuList>
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

                  {navLinks?.length ? (
                    <nav aria-label='Categorías' className='mt-4 flex flex-col gap-1'>
                      <Accordion type='multiple'>{renderMobileLinks(navLinks)}</Accordion>
                    </nav>
                  ) : null}
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
