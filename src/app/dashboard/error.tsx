'use client';

import { ErrorFallback } from '@/shared/components/error-fallback';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function DashboardError({ error, retry }: DashboardErrorProps) {
  return (
    <ErrorFallback
      title='No se pudo cargar el panel'
      description='Ocurrió un error al cargar esta sección del panel. Puedes intentar de nuevo.'
      digest={error.digest}
      retry={retry}
    />
  );
}
