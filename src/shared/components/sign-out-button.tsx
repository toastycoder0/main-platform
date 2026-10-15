'use client';

import { LoaderCircleIcon, LogOutIcon } from 'lucide-react';
import { useTransition } from 'react';
import { logout } from '@/infrastructure/auth/actions';
import { submitAction } from '@/shared/actions/submit-action';

type SignOutButtonProps = React.ComponentProps<'button'>;

export function SignOutButton({ onClick, children, ...props }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  // Under `asChild`, Radix Slot injects its own onClick; it must be chained, not overwritten.
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(e);

    startTransition(async () => {
      await submitAction(() => logout());
    });
  }

  return (
    <button
      type='button'
      {...props}
      onClick={handleClick}
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
