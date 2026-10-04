import { ChevronsUpDownIcon } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/shared/components/avatar';
import { DropdownMenu, DropdownMenuTrigger } from '@/shared/components/dropdown-menu';
import { navigationMenuTriggerStyle } from '@/shared/components/navigation-menu';
import { UserNavContent } from '@/shared/components/user-nav';

interface DesktopUserAreaProps {
  isAuthenticated: boolean;
  userName: string | undefined;
  userEmail?: string | undefined;
}

export function DesktopUserArea({ isAuthenticated, userName, userEmail }: DesktopUserAreaProps) {
  if (!isAuthenticated) {
    return (
      <Link href='/auth/login' className={navigationMenuTriggerStyle()}>
        Iniciar sesión
      </Link>
    );
  }

  const userInitial = userName?.charAt(0).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className='flex items-center gap-2 rounded-md p-1.5 text-sm font-medium outline-none transition-all hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 overflow-hidden max-w-44'
          aria-label='Menú de usuario'
        >
          <Avatar size='sm'>
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <span className='text-sm font-medium truncate'>{userName || 'Usuario'}</span>
        </button>
      </DropdownMenuTrigger>
      <UserNavContent user={{ name: userName ?? 'Usuario', email: userEmail }} hideHomeLink />
    </DropdownMenu>
  );
}

interface MobileAuthAreaProps {
  isAuthenticated: boolean;
  userName?: string | undefined;
  userEmail?: string | undefined;
}

export function MobileAuthArea({ isAuthenticated, userName, userEmail }: MobileAuthAreaProps) {
  if (!isAuthenticated) {
    return (
      <Link
        href='/auth/login'
        className='flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted'
      >
        Iniciar sesión
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className='flex w-full items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'
          aria-label='Menú de usuario'
        >
          <Avatar size='sm'>
            <AvatarFallback>{userName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <span className='truncate text-sm font-medium'>{userName || 'Usuario'}</span>
          <ChevronsUpDownIcon className='ml-auto size-4 shrink-0 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <UserNavContent user={{ name: userName ?? 'Usuario', email: userEmail }} align='start' />
    </DropdownMenu>
  );
}
