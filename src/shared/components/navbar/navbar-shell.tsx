import type { ReactNode } from 'react';
import { NavbarLogo } from './navbar-logo';

interface NavbarShellProps {
  children: ReactNode;
}

/**
 * Static chrome of the navbar. Rendered outside any Suspense boundary so it
 * hydrates with the initial shell; overlays (Radix) mutate these body-level
 * nodes via aria-hidden, and doing so after hydration avoids render mismatches.
 */
export function NavbarShell({ children }: NavbarShellProps) {
  return (
    <>
      <header className='sticky top-0 z-40 border-b border-neutral-200 bg-white'>{children}</header>
      <div className='fixed top-3 left-4 z-60 md:hidden'>
        <NavbarLogo />
      </div>
    </>
  );
}
