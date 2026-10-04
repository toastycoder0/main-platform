import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { DashboardPageHeader, DashboardSidebar } from '@/shared/components/dashboard-sidebar';
import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';
import { DASHBOARD_SECTIONS } from '@/shared/constants/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const ctx = await createRequestContext();

  // Auth is a navigation concern here: guests are sent to the login page
  // instead of throwing into the error boundary.
  if (!ctx.session) {
    redirect('/auth/login');
  }

  const sections = DASHBOARD_SECTIONS.filter((s) => ctx.permissions.has(s.slug));

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={{
          name: ctx.session.user.name,
          email: ctx.session.user.email,
        }}
        sections={sections}
      />
      <SidebarInset>
        <DashboardPageHeader />
        <div className='flex flex-1 flex-col px-4 py-6'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
