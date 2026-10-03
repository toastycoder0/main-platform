import type { ReactNode } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { requireAuthenticated } from '@/infrastructure/services/base';
import { DashboardPageHeader, DashboardSidebar } from '@/shared/components/dashboard-sidebar';
import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';
import { DASHBOARD_SECTIONS } from '@/shared/constants/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const ctx = await createRequestContext();
  requireAuthenticated(ctx);

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
