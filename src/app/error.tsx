'use client';

import { ErrorFallback } from '@/shared/components/error-fallback';

interface RootErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function RootError({ error, retry }: RootErrorProps) {
  return (
    <div className='h-dvh w-full'>
      <ErrorFallback
        title='Error inesperado'
        description='Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.'
        digest={error.digest}
        retry={retry}
      />
    </div>
  );
}
