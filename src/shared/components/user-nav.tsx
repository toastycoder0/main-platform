'use client';

import { HouseIcon, UserPen } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/modules/auth/components/sign-out-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/avatar';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/shared/components/dropdown-menu';

export interface NavUser {
  name: string;
  email?: string | undefined;
  image?: string | null;
}

interface UserNavContentProps {
  user: NavUser;
  hideHomeLink?: boolean;
  align?: 'start' | 'end';
}

export function UserNavContent({ user, hideHomeLink = false, align = 'end' }: UserNavContentProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenuContent className='min-w-56 rounded-lg' align={align}>
      <DropdownMenuLabel className='p-0 font-normal'>
        <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
          <Avatar className='h-8 w-8 rounded-lg'>
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className='rounded-lg'>{initials}</AvatarFallback>
          </Avatar>
          <div className='grid flex-1 text-left text-sm leading-tight'>
            <span className='truncate font-medium'>{user.name}</span>
            {user.email && <span className='truncate text-xs'>{user.email}</span>}
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href='/account'>
          <UserPen />
          Cuenta
        </Link>
      </DropdownMenuItem>
      {!hideHomeLink && (
        <DropdownMenuItem asChild>
          <Link href='/'>
            <HouseIcon />
            Ir al inicio
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <SignOutButton className='flex w-full items-center gap-2 [&>svg]:size-4'>
          Cerrar sesi&oacute;n
        </SignOutButton>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
