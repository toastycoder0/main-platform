import Link from 'next/link';
import { Button } from '@/shared/components/button';

export default function NotFound() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center'>
      <p className='text-9xl font-bold tracking-tight'>404</p>
      <div className='space-y-1'>
        <h1 className='text-xl font-semibold'>Página no encontrada</h1>
        <p className='text-sm text-muted-foreground'>
          La página que buscas no existe o fue movida.
        </p>
      </div>
      <Button asChild>
        <Link href='/'>Ir al inicio</Link>
      </Button>
    </main>
  );
}
