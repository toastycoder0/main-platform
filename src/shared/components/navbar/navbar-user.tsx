'use client';

import { useEffect } from 'react';
import { useNavbar } from './navbar';
import { DesktopUserArea, MobileAuthArea } from './user-area';

interface NavbarUserProps {
  isAuthenticated: boolean;
  userName: string | undefined;
  userEmail?: string | undefined;
}

export function NavbarUser({ isAuthenticated, userName, userEmail }: NavbarUserProps) {
  const { register, unregister } = useNavbar();

  useEffect(() => {
    register('user', {
      desktop: (
        <DesktopUserArea
          isAuthenticated={isAuthenticated}
          userName={userName}
          userEmail={userEmail}
        />
      ),
      mobile: (
        <MobileAuthArea
          isAuthenticated={isAuthenticated}
          userName={userName}
          userEmail={userEmail}
        />
      ),
    });
    return () => unregister('user');
  }, [isAuthenticated, userName, userEmail, register, unregister]);

  return null;
}
