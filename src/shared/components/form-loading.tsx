import { Skeleton } from '@/shared/components/skeleton';

interface FormLoadingProps {
  /** Width of the heading skeleton: 'w-40' for create forms, 'w-56' for edit forms. */
  headingWidth?: 'w-40' | 'w-56';
}

export function FormLoading({ headingWidth = 'w-56' }: FormLoadingProps) {
  return (
    <div aria-busy='true' data-slot='form-loading'>
      <span className='sr-only'>Cargando formulario…</span>
      <div aria-hidden='true' className='flex flex-col gap-4'>
        <Skeleton className={`h-8 ${headingWidth}`} />
        <Skeleton className='h-16 w-full max-w-xl' />
        <Skeleton className='h-32 w-full max-w-xl' />
        <Skeleton className='h-9 w-40' />
      </div>
    </div>
  );
}
