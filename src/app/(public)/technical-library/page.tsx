import type { Metadata } from 'next/types';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import { TechnicalLibraryLayout } from '@/modules/technical-library/components/technical-library-layout';
import { TechnicalLibrarySearch } from '@/modules/technical-library/components/technical-library-search';
import {
  type LibraryParams,
  loadLibraryParams,
} from '@/modules/technical-library/infrastructure/technical-library.params';
import { queryTechnicalLibrary } from '@/modules/technical-library/infrastructure/technical-library.query';
import { Skeleton } from '@/shared/components/skeleton';

export const metadata: Metadata = {
  title: 'Biblioteca Técnica',
};

interface TechnicalLibraryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function TechnicalLibraryContent({
  ctx,
  params,
}: {
  ctx: RequestContext;
  params: Promise<LibraryParams>;
}) {
  const parsed = await params;
  const result = await queryTechnicalLibrary(ctx, parsed);

  return <TechnicalLibraryLayout result={result} params={parsed} />;
}

function SearchSkeleton() {
  return (
    <div className='flex flex-col gap-5' aria-busy='true'>
      <Skeleton className='h-9 w-full max-w-md' />
      <div className='lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8'>
        <aside className='hidden lg:block'>
          <Skeleton className='h-72 w-full' />
        </aside>
        <div className='flex flex-col gap-5'>
          <Skeleton className='h-5 w-48' />
          <div className='grid grid-cols-1 gap-x-6 border-t border-neutral-200/30 md:grid-cols-2 xl:grid-cols-3'>
            <Skeleton className='h-44 w-full' />
            <Skeleton className='hidden h-44 w-full md:block' />
            <Skeleton className='hidden h-44 w-full xl:block' />
          </div>
        </div>
      </div>
    </div>
  );
}

const TechnicalLibraryPage = async ({ searchParams }: TechnicalLibraryPageProps) => {
  const ctx = await createRequestContext();

  return (
    <div className='flex flex-col gap-6'>
      <section className='flex flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-bold text-foreground'>Biblioteca Técnica</h1>
          <p className='text-sm text-muted-foreground'>
            Manuales, fichas técnicas y documentación de productos para descargar.
          </p>
        </div>
        <TechnicalLibrarySearch />
      </section>

      <Suspense fallback={<SearchSkeleton />}>
        <TechnicalLibraryContent ctx={ctx} params={loadLibraryParams(searchParams)} />
      </Suspense>
    </div>
  );
};

export default TechnicalLibraryPage;
