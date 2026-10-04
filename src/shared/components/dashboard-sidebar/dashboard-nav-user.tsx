'use client';

import { ChevronsUpDownIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/avatar';
import { DropdownMenu, DropdownMenuTrigger } from '@/shared/components/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/shared/components/sidebar';
import { type NavUser, UserNavContent } from '@/shared/components/user-nav';

interface DashboardNavUserProps {
  user: NavUser;
}

export function DashboardNavUser({ user }: DashboardNavUserProps) {
  const { isMobile } = useSidebar();
  const initials = user.name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className='rounded-lg'>{initials}</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDownIcon className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <UserNavContent
            user={user}
            align={isMobile ? 'start' : 'end'}
            side={isMobile ? 'bottom' : 'right'}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
