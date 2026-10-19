'use client';

import { cn } from '@/shared/utils/cn';
import { DesktopUserArea, MobileAuthArea } from './user-area';

interface NavbarUserProps {
  isAuthenticated: boolean;
  userName: string | undefined;
  userEmail?: string | undefined;
  variant?: 'bar' | 'panel';
  className?: string;
}

export function NavbarUser({
  isAuthenticated,
  userName,
  userEmail,
  variant = 'bar',
  className,
}: NavbarUserProps) {
  const isPanel = variant === 'panel';

  return (
    <div className={cn('flex items-center', isPanel && 'w-full', className)}>
      {isPanel ? (
        <MobileAuthArea
          isAuthenticated={isAuthenticated}
          userName={userName}
          userEmail={userEmail}
        />
      ) : (
        <DesktopUserArea
          isAuthenticated={isAuthenticated}
          userName={userName}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
