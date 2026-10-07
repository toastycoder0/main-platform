'use client';

import { HouseIcon } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { getNav } from '@/modules/registry';
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
import type { NavUser } from '@/shared/components/user-nav';
import { DashboardNavUser } from './dashboard-nav-user';

export function DashboardSidebar({
  user,
  permissions,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUser;
  permissions: string[];
}) {
  const sections = getNav('dashboard', permissions);
  const adminSections = sections.filter((s) => s.group === 'admin');

  return (
    <Sidebar variant='sidebar' {...props}>
      <SidebarHeader className='p-4'>
        <Link href='/'>
          <LogoLarge className='h-8 w-auto self-start' />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenu>
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

        {adminSections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administraci&oacute;n</SidebarGroupLabel>
            <SidebarMenu>
              {adminSections.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
