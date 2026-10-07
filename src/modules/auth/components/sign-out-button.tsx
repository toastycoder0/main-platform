'use client';

import { LoaderCircleIcon, LogOutIcon } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { logout } from '@/modules/auth/infrastructure/auth.action';

type SignOutButtonProps = React.ComponentProps<'button'>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);

    startTransition(async () => {
      const result = await logout();

      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      {...props}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <LoaderCircleIcon className='animate-spin' aria-hidden='true' />
      ) : (
        <LogOutIcon aria-hidden='true' />
      )}
      {children}
    </button>
  );
}
