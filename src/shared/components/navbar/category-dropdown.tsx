'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/shared/components/navigation-menu';
import { cn } from '@/shared/utils/cn';
import type { NavLink } from './nav-link';

const DEPTH_CLASSES: Record<number, string> = {
  0: 'font-medium',
  1: 'ml-3',
  2: 'ml-6',
  3: 'ml-9',
  4: 'ml-12',
  5: 'ml-16',
  6: 'ml-20',
};

function SubLinks({ links, depth = 0 }: { links: NavLink[]; depth?: number }) {
  const indent = DEPTH_CLASSES[depth] ?? 'ml-20';

  return links.map((link) => (
    <li key={link.href} className='break-inside-avoid'>
      <NavigationMenuLink href={link.href} className={cn(indent, depth === 0 && 'font-semibold')}>
        {link.label}
      </NavigationMenuLink>
      {link.children?.length && (
        <ul className='mt-1'>
          <SubLinks links={link.children} depth={depth + 1} />
        </ul>
      )}
    </li>
  ));
}

export function NavLinks({ links }: { links: NavLink[] }) {
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

interface CategoryDropdownContentProps {
  links: NavLink[];
}

export function CategoryDropdownContent({ links }: CategoryDropdownContentProps) {
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
      <SubLinks links={links} />
    </ul>
  );
}
