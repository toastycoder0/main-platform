import { cn } from '@/shared/utils/cn';

interface MatrixLoaderProps {
  /** Overrides the wrapper layout, e.g. `min-h-[50vh]` for embedded loading states. */
  className?: string;
}

export function MatrixLoader({ className }: MatrixLoaderProps) {
  return (
    <output className={cn('flex min-h-dvh items-center justify-center', className)}>
      <span className='sr-only'>Cargando…</span>
      <div
        aria-hidden='true'
        className='size-28 bg-linear-to-b from-transparent via-white to-transparent bg-size-[25px_400%] bg-no-repeat animate-matrix'
        style={{
          backgroundImage: `
            linear-gradient(#0000 calc(1*100%/6),#000 0 calc(3*100%/6),#0000 0),
            linear-gradient(#0000 calc(2*100%/6),#000 0 calc(4*100%/6),#0000 0),
            linear-gradient(#0000 calc(3*100%/6),#000 0 calc(5*100%/6),#0000 0)`,
        }}
      />
    </output>
  );
}
