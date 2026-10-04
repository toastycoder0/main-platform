'use client';

import { LogOutIcon } from 'lucide-react';
import { toast } from 'sonner';
import { logout } from '@/modules/auth/infrastructure/auth.action';

type SignOutButtonProps = React.ComponentProps<'button'>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);

    const result = await logout();

    if (!result.success) {
      toast.error(result.error);
    }
  }

  return (
    <button type='button' onClick={handleClick} {...props}>
      <LogOutIcon />
      {children}
    </button>
  );
}
