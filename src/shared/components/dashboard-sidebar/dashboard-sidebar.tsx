'use client';

import { HouseIcon } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { LogoLarge } from '@/shared/components/logo-large';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/components/sidebar';
import type { NavSection } from '@/shared/constants/navigation';
import { DashboardNavUser, type NavUser } from './dashboard-nav-user';

export function DashboardSidebar({
  user,
  permissions,
  sections,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUser;
  permissions: Set<string>;
  sections: NavSection[];
}) {
  const visibleSections = sections.filter((s) => permissions.has(s.slug));

  return (
    <Sidebar variant='sidebar' {...props}>
      <SidebarHeader className='p-4'>
        <Link href='/'>
          <LogoLarge className='h-8 w-auto self-start' />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {visibleSections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Navegaci&oacute;n</SidebarGroupLabel>
            <SidebarMenu>
              {visibleSections.map((section) => (
                <SidebarMenuItem key={section.href}>
                  <SidebarMenuButton asChild>
                    <Link href={section.href}>
                      <section.icon />
                      <span>{section.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href='/'>
                    <HouseIcon />
                    <span>Ir al inicio</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <DashboardNavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
