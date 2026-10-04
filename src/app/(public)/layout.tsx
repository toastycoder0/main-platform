import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { Footer } from '@/shared/components/footer';
import { Navbar } from '@/shared/components/navbar';
import { NavbarSkeleton } from '@/shared/components/navbar/navbar-skeleton';

interface PublicLayoutProps {
  children?: ReactNode;
}

const navLinks = [
  { label: 'Recursos', href: '/technical-library' },
  { label: 'Asesor\u00edas', href: '/technical-advice' },
];

async function PublicNavbar() {
  const session = await getSession();

  const links = session
    ? [...navLinks, { label: 'Panel de control', href: '/dashboard' }]
    : navLinks;

  return (
    <Navbar
      isAuthenticated={!!session}
      userName={session?.user.name}
      userEmail={session?.user.email}
      userLinks={undefined}
      navLinks={links}
    />
  );
}

function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <Suspense fallback={<NavbarSkeleton />}>
        <PublicNavbar />
      </Suspense>
      <main className='mx-auto max-w-360 px-4 py-6 md:px-6'>{children}</main>
      <Footer />
    </>
  );
}

export default PublicLayout;
