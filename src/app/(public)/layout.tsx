import type { ReactNode } from 'react';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { Footer } from '@/shared/components/footer';
import { Navbar } from '@/shared/components/navbar';

interface PublicLayoutProps {
  children?: ReactNode;
}

const navLinks = [
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
        navLinks={navLinks}
      />
      <main className='mx-auto max-w-360 px-4 py-6 md:px-6'>{children}</main>
      <Footer />
    </>
  );
}

export default PublicLayout;
