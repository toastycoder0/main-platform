import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { DashboardPageHeader, DashboardSidebar } from '@/shared/components/dashboard-sidebar';
import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login');
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={{
          name: ctx.session.user.name,
          email: ctx.session.user.email,
        }}
        permissions={Array.from(ctx.permissions)}
      />
      <SidebarInset>
        <DashboardPageHeader />
        <div className='flex flex-1 flex-col px-4 py-6'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
