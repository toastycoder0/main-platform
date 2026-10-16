'use client';

import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import { buttonVariants } from '@/shared/components/button';
import { NavigationMenu, NavigationMenuList } from '@/shared/components/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/sheet';

type NavbarSlotId = 'brand' | 'search' | 'links' | 'user' | 'cart';

interface NavbarSlotContent {
  desktop?: ReactNode;
  mobile?: ReactNode;
}

interface NavbarContextValue {
  register: (id: NavbarSlotId, content: NavbarSlotContent) => void;
  unregister: (id: NavbarSlotId) => void;
}

const NavbarContext = createContext<NavbarContextValue | null>(null);

function useNavbar() {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error('useNavbar must be used within a Navbar.');
  }

  return context;
}

interface NavbarProps {
  children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  const [slots, setSlots] = useState<Partial<Record<NavbarSlotId, NavbarSlotContent>>>({});

  const contextValue = useMemo<NavbarContextValue>(
    () => ({
      register: (id, content) => setSlots((prev) => ({ ...prev, [id]: content })),
      unregister: (id) =>
        setSlots((prev) => {
          if (!prev[id]) {
            return prev;
          }

          const next = { ...prev };
          delete next[id];
          return next;
        }),
    }),
    [],
  );

  return (
    <NavbarContext.Provider value={contextValue}>
      {children}

      <div
        data-slot='navbar-top'
        className='mx-auto hidden max-w-360 items-center gap-3 px-4 md:px-6 pt-3 pb-3 md:flex'
      >
        <div className='flex-1'>{slots.brand?.desktop}</div>
        {slots.search?.desktop && (
          <div className='w-72 lg:w-xl shrink-0'>{slots.search.desktop}</div>
        )}

        <div className='flex flex-1 items-center justify-end gap-3'>
          {slots.user?.desktop}
          {slots.cart?.desktop}
        </div>
      </div>

      {slots.links?.desktop && (
        <div
          data-slot='navbar-links'
          className='mx-auto hidden max-w-7xl flex-wrap justify-center px-4 pb-1.5 md:flex'
        >
          <NavigationMenu className='max-w-max'>
            <NavigationMenuList>{slots.links.desktop}</NavigationMenuList>
          </NavigationMenu>
        </div>
      )}

      <div
        data-slot='navbar-mobile'
        className='flex items-center justify-end gap-1 px-4 py-3 md:hidden'
      >
        <div className='flex items-center gap-1'>
          {slots.cart?.mobile}
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
                {slots.search?.mobile}
                {slots.links?.mobile}
              </div>

              <div className='flex flex-col gap-2 border-t border-neutral-100 p-4'>
                {slots.user?.mobile}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </NavbarContext.Provider>
  );
}

export { useNavbar };
export type { NavbarSlotContent, NavbarSlotId };
