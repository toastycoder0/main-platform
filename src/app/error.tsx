'use client';

import { type ErrorBoundaryProps, ErrorFallback } from '@/shared/components/error-fallback';

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
