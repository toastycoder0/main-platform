'use client';

import './globals.css';

import { ErrorFallback } from '@/shared/components/error-fallback';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang='es'>
      <body className='bg-background flex w-full text-foreground min-h-dvh'>
        <div className='m-auto'>
          <ErrorFallback
            title='Error inesperado'
            description='No pudimos cargar la aplicación. Puedes intentar de nuevo o volver al inicio.'
            digest={error.digest}
            retry={retry}
          />
        </div>
      </body>
    </html>
  );
}
