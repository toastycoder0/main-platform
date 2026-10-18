import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';
import { NavbarBar } from './navbar-bar';

interface NavbarLinksRowProps {
  children: ReactNode;
  className?: string;
}

/** Secondary desktop row for layouts that keep the links below the main bar. */
export function NavbarLinksRow({ children, className }: NavbarLinksRowProps) {
  return <NavbarBar className={cn('justify-center py-0 pb-1.5', className)}>{children}</NavbarBar>;
}
