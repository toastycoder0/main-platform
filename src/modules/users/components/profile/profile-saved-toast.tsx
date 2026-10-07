'use client';

import { parseAsStringEnum, useQueryState } from 'nuqs';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const SAVED_MESSAGES = {
  profile: 'Cambios guardados',
  password: 'Contraseña actualizada',
} as const;

type SavedFlag = keyof typeof SAVED_MESSAGES;

export function ProfileSavedToast() {
  const [saved, setSaved] = useQueryState(
    'saved',
    parseAsStringEnum<SavedFlag>(['profile', 'password']).withOptions({ history: 'replace' }),
  );
  const handled = useRef(false);

  useEffect(() => {
    if (!saved) {
      handled.current = false;
      return;
    }

    if (handled.current) {
      return;
    }

    handled.current = true;
    toast.success(SAVED_MESSAGES[saved]);
    setSaved(null).catch(() => undefined);
  }, [saved, setSaved]);

  return null;
}
