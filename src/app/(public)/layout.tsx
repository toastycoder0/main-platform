import type { ReactNode } from 'react';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { Navbar } from '@/shared/components/navbar';

interface PublicLayoutProps {
  children?: ReactNode;
}

async function PublicLayout({ children }: PublicLayoutProps) {
  const session = await getSession();

  return (
    <>
      <Navbar isAuthenticated={!!session} userName={session?.user.firstName} />
      {children}
    </>
  );
}

export default PublicLayout;
