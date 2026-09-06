import type { ReactNode } from 'react';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { Navbar, type NavLink } from '@/shared/components/navbar';

interface PublicLayoutProps {
  children?: ReactNode;
}

export const companyLinks: NavLink[] = [
  { label: 'Categor\u00edas', href: '/products' },
  { label: 'Marcas', href: '/products?brand=all' },
  { label: 'Recursos', href: '/technical-library' },
  { label: 'Asesor\u00edas', href: '/technical-advice' },
];

async function PublicLayout({ children }: PublicLayoutProps) {
  const session = await getSession();

  return (
    <>
      <Navbar
        isAuthenticated={!!session}
        userName={session?.user.name}
        userLinks={undefined}
        navLinks={companyLinks}
        onSearch={undefined}
      />
      {children}
    </>
  );
}

export default PublicLayout;
