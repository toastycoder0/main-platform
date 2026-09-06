'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/modules/auth/infrastructure/auth.action';

interface SignOutButtonProps extends React.ComponentProps<'button'> {
  afterSignOut?: () => void;
}

export function SignOutButton({ onClick, afterSignOut, ...props }: SignOutButtonProps) {
  const router = useRouter();

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    await logout();
    router.refresh();
    onClick?.(e);
    afterSignOut?.();
  }

  return <button type='button' onClick={handleClick} {...props} />;
}
