'use client';

import { type ErrorBoundaryProps, ErrorFallback } from '@/shared/components/error-fallback';

// Catches render errors from every segment below the root layout. It does not
// wrap the root layout itself (see global-error.tsx for that).
export default function RootError(props: ErrorBoundaryProps) {
  return (
    <ErrorFallback
      {...props}
      layout='page'
      title='Error inesperado'
      description='Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.'
    />
  );
}
