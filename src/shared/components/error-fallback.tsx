import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/button';

interface ErrorFallbackProps {
  title: string;
  description: string;
  digest?: string | undefined;
  retry: () => void;
}

export function ErrorFallback({ title, description, digest, retry }: ErrorFallbackProps) {
  return (
    <div
      role='alert'
      className='flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center'
    >
      <TriangleAlertIcon className='size-10 text-destructive' aria-hidden='true' />
      <div className='space-y-1'>
        <h1 className='text-xl font-semibold'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{description}</p>
        {digest && <p className='text-xs text-muted-foreground'>Referencia: {digest}</p>}
      </div>
      <div className='flex flex-wrap justify-center gap-2'>
        <Button onClick={retry}>
          <RotateCcwIcon />
          Intentar de nuevo
        </Button>
        <Button variant='outline' asChild>
          <Link href='/'>Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
