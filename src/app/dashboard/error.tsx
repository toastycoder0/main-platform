'use client';

import { type ErrorBoundaryProps, ErrorFallback } from '@/shared/components/error-fallback';

// error.tsx does not wrap its own segment's layout, so the sidebar and header
// stay mounted and only the content area is replaced by this fallback.
export default function DashboardError(props: ErrorBoundaryProps) {
  return (
    <ErrorFallback
      {...props}
      title='No se pudo cargar el panel'
      description='Ocurrió un error al cargar esta sección del panel. Puedes intentar de nuevo.'
    />
  );
}
