import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { getNav, resolveLogoHref } from '@/modules/registry';
import type { NavLink } from '@/shared/components/navbar';
import {
  NavbarBar,
  NavbarLinks,
  NavbarLogo,
  NavbarMobileMenu,
  NavbarShell,
  NavbarUser,
} from '@/shared/components/navbar';

interface WarehouseLayoutProps {
  children: ReactNode;
}

export default async function WarehouseLayout({ children }: WarehouseLayoutProps) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  const permissions = Array.from(ctx.permissions);
  const logoHref = resolveLogoHref('warehouse', permissions);
  const navLinks = getNav('warehouse', permissions)
    .filter((item) => item.href !== logoHref)
    .map((item): NavLink => ({ label: item.label, href: item.href }));

  return (
    <div className='flex min-h-dvh flex-col'>
      <NavbarShell logoHref={logoHref}>
        <NavbarBar>
          <NavbarLogo href={logoHref} className='mr-4' />
          <NavbarLinks links={navLinks} />
          <NavbarUser
            isAuthenticated
            userName={ctx.session.user.name}
            userEmail={ctx.session.user.email}
            className='flex-1 justify-end'
          />
        </NavbarBar>

        <NavbarMobileMenu
          footer={
            <NavbarUser
              isAuthenticated
              userName={ctx.session.user.name}
              userEmail={ctx.session.user.email}
              variant='panel'
            />
          }
        >
          <NavbarLinks links={navLinks} variant='panel' />
        </NavbarMobileMenu>
      </NavbarShell>
      <main className='mx-auto flex w-full min-h-0 max-w-360 flex-1 flex-col px-4 py-6 md:px-6'>
        {children}
      </main>
    </div>
  );
}
