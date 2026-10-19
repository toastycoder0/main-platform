import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface NavbarBarProps {
  children: ReactNode;
  className?: string;
}

/** Desktop-only row. Order and alignment belong to the consumer through `children` and `className`. */
export function NavbarBar({ children, className }: NavbarBarProps) {
  return (
    <div
      data-slot='navbar-bar'
      className={cn(
        'mx-auto hidden max-w-360 items-center gap-3 px-4 py-3 md:flex md:px-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
