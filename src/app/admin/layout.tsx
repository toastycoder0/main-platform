import type { ReactNode } from 'react';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { AdminSidebar } from '@/shared/components/admin-sidebar';
import { AdminPageHeader } from '@/shared/components/admin-sidebar/admin-page-header';
import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();

  return (
    <SidebarProvider>
      <AdminSidebar
        user={{
          name: session?.user.name ?? 'Admin',
          email: session?.user.email ?? '',
          image: session?.user.image ?? null,
        }}
      />
      <SidebarInset>
        <AdminPageHeader />
        <div className='flex flex-1 flex-col'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
