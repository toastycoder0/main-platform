import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { getNav } from '@/modules/registry';
import type { NavLink } from '@/shared/components/navbar';
import {
  Navbar,
  NavbarBrand,
  NavbarLinks,
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

  const navLinks = getNav('warehouse', Array.from(ctx.permissions)).map(
    (item): NavLink => ({ label: item.label, href: item.href }),
  );

  return (
    <>
      <NavbarShell logoHref='/warehouse'>
        <Navbar>
          <NavbarBrand href='/warehouse' />
          <NavbarLinks links={navLinks} />
          <NavbarUser
            isAuthenticated
            userName={ctx.session.user.name}
            userEmail={ctx.session.user.email}
          />
        </Navbar>
      </NavbarShell>
      <main className='mx-auto max-w-360 px-4 py-6 md:px-6'>{children}</main>
    </>
  );
}
