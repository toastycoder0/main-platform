import Link from 'next/link';
import { SignOutButton } from '@/modules/auth/components/sign-out-button';
import { Avatar, AvatarFallback } from '@/shared/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { navigationMenuTriggerStyle } from '@/shared/components/navigation-menu';

interface DesktopUserAreaProps {
  isAuthenticated: boolean;
  userName: string | undefined;
}

export function DesktopUserArea({ isAuthenticated, userName }: DesktopUserAreaProps) {
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
      <DropdownMenuContent align='end'>
        <DropdownMenuItem asChild>
          <Link href='/profile'>Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className='w-full'>
          <SignOutButton aria-label='Cerrar sesión'>Cerrar sesión</SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface MobileAuthAreaProps {
  isAuthenticated: boolean;
}

export function MobileAuthArea({ isAuthenticated }: MobileAuthAreaProps) {
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
    <>
      <Link
        href='/profile'
        className='flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted'
      >
        Perfil
      </Link>
      <SignOutButton className='flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted'>
        Cerrar sesión
      </SignOutButton>
    </>
  );
}
