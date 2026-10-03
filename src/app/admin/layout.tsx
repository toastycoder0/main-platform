import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { getSession } from '@/modules/auth/infrastructure/auth.query';
import { DashboardPageHeader, DashboardSidebar } from '@/shared/components/dashboard-sidebar';
import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';

const routeLabels: Record<string, string> = {
  admin: 'Administraci\u00f3n',
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '/admin';
  const parts = pathname.split('/').filter(Boolean);
  const segments = parts.map((segment, i) => ({
    label: routeLabels[segment] ?? segment,
    href: `/${parts.slice(0, i + 1).join('/')}`,
  }));

  const session = await getSession();

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={{
          name: session?.user.name ?? 'Admin',
          email: session?.user.email ?? '',
        }}
        permissions={new Set<string>()}
        sections={[]}
      />
      <SidebarInset>
        <DashboardPageHeader segments={segments} />
        <div className='flex flex-1 flex-col px-4 py-6'>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
