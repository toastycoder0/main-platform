'use client';

import './globals.css';

import { type ErrorBoundaryProps, ErrorFallback } from '@/shared/components/error-fallback';

// Replaces the root layout when it fails, so it must render its own document.
// Global styles are imported explicitly because the root layout never ran.
export default function GlobalError(props: ErrorBoundaryProps) {
  return (
    <html lang='es'>
      <body className='bg-background text-foreground'>
        <ErrorFallback
          {...props}
          layout='page'
          title='Error inesperado'
          description='No pudimos cargar la aplicación. Puedes intentar de nuevo o volver al inicio.'
        />
      </body>
    </html>
  );
}
