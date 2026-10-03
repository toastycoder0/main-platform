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
import { AdminNavUser } from './admin-nav-user';

export function AdminSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}) {
  return (
    <Sidebar variant='sidebar' {...props}>
      <SidebarHeader className='p-4'>
        <Link href='/'>
          <LogoLarge className='h-8 w-auto self-start' />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegaci&oacute;n</SidebarGroupLabel>
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
      </SidebarContent>
      <SidebarFooter>
        <AdminNavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
