'use client';

import { type ErrorBoundaryProps, ErrorFallback } from '@/shared/components/error-fallback';

export default function DashboardError(props: ErrorBoundaryProps) {
  return (
    <ErrorFallback
      {...props}
      title='No se pudo cargar el panel'
      description='Ocurrió un error al cargar esta sección del panel. Puedes intentar de nuevo.'
    />
  );
}
