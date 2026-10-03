'use client';

import { HouseIcon, type LucideIcon, ShieldIcon, UsersIcon } from 'lucide-react';
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
import type { NavUser } from '@/shared/components/user-nav';
import type { NavSection, SectionIconName } from '@/shared/constants/navigation';
import { DashboardNavUser } from './dashboard-nav-user';

const SECTION_ICONS: Record<SectionIconName, LucideIcon> = {
  users: UsersIcon,
  roles: ShieldIcon,
};

export function DashboardSidebar({
  user,
  sections,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUser;
  sections: NavSection[];
}) {
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
              {adminSections.map((section) => {
                const Icon = SECTION_ICONS[section.icon];

                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton asChild>
                      <Link href={section.href}>
                        <Icon />
                        <span>{section.label}</span>
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
