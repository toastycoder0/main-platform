import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/utils/cn';

// Contract shared by every Next error boundary file (error.tsx, global-error.tsx)
export interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  retry: () => void;
}

interface ErrorFallbackProps extends ErrorBoundaryProps {
  title: string;
  description: string;
  /** 'page' centers on the viewport; 'area' fills the parent segment. */
  layout?: 'page' | 'area';
}

// Presentational fallback shared by every error boundary. Each error file only
// adapts Next's props to this component. The raw error message is never
// rendered: server errors arrive masked and the digest is the safe handle to
// correlate with server-side logs.
export function ErrorFallback({
  error,
  retry,
  title,
  description,
  layout = 'area',
}: ErrorFallbackProps) {
  return (
    <div
      role='alert'
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        layout === 'page' ? 'min-h-dvh' : 'min-h-full',
      )}
    >
      <div className='w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm'>
        <span className='mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10'>
          <TriangleAlertIcon className='size-6 text-destructive' aria-hidden='true' />
        </span>
        <h1 className='text-lg font-semibold'>{title}</h1>
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
        {error.digest && (
          <p className='mt-2 text-xs text-muted-foreground'>Referencia: {error.digest}</p>
        )}
        <div className='mt-6 flex flex-wrap justify-center gap-2'>
          <Button onClick={retry}>
            <RotateCcwIcon />
            Intentar de nuevo
          </Button>
          <Button variant='outline' asChild>
            <Link href='/'>Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
