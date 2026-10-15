import type { Metadata } from 'next/types';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import type { TechnicalLibraryItemDTO } from '@/modules/products/application/products.types';
import { listTechnicalLibrary } from '@/modules/products/infrastructure/products.query';
import { CallToAction } from '@/shared/components/call-to-action';
import { ListEmptyState } from '@/shared/components/list-empty';
import { ListPagination } from '@/shared/components/list-pagination';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { Skeleton } from '@/shared/components/skeleton';
import { type ListParams, loadListParams } from '@/shared/list/list-params';
import { TechnicalLibraryDocumentList } from './document-list';

export const metadata: Metadata = {
  title: 'Biblioteca Técnica',
};

interface TechnicalLibraryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function TechnicalLibraryListing({
  ctx,
  params,
}: {
  ctx: RequestContext;
  params: Promise<ListParams>;
}) {
  const parsed = await params;
  const { items, total } = await listTechnicalLibrary(ctx, parsed);

  if (items.length === 0) {
    const outOfRange = parsed.page > 1 && total === 0;

    return <ListEmptyState entity='documentos técnicos' outOfRange={outOfRange} />;
  }

  return (
    <>
      <div className='flex flex-col gap-6 items-center'>
        {items.map((item) => (
          <TechnicalLibraryCard key={item.productId} item={item} />
        ))}
      </div>

      <ListPagination basePath='/technical-library' params={parsed} total={total} />
    </>
  );
}

function TechnicalLibraryCardImage({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <picture>
        <img
          alt=''
          className='size-32 shrink-0 rounded-lg object-cover md:size-36'
          src={imageUrl}
        />
      </picture>
    );
  }

  return (
    <div className='flex size-32 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-neutral-200 to-neutral-100 md:size-36'>
      <span className='text-4xl text-neutral-400'>📄</span>
    </div>
  );
}

function TechnicalLibraryCard({ item }: { item: TechnicalLibraryItemDTO }) {
  return (
    <div className='border-t border-b border-neutral-200 w-full max-w-7xl'>
      <div className='flex flex-wrap items-center gap-4 px-4 py-3 md:px-5 md:py-4 md:flex-nowrap'>
        <TechnicalLibraryCardImage imageUrl={item.imageUrl} />

        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <h2 className='text-lg font-semibold leading-tight text-neutral-900'>
            {item.productTitle}
          </h2>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500'>
            {item.brandName ? (
              <span className='font-medium text-neutral-600'>{item.brandName}</span>
            ) : null}
            {item.productCode ? (
              <code className='rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-400'>
                {item.productCode}
              </code>
            ) : null}
            <span className='text-xs text-neutral-400'>
              {item.documents.length} {item.documents.length === 1 ? 'documento' : 'documentos'}
            </span>
          </div>
        </div>
      </div>

      <TechnicalLibraryDocumentList documents={item.documents} />
    </div>
  );
}

function TechnicalLibrarySkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-busy='true'>
      <Skeleton className='h-36 w-full rounded-xl' />
      <Skeleton className='h-36 w-full rounded-xl' />
      <Skeleton className='h-36 w-full rounded-xl' />
    </div>
  );
}

const TechnicalLibraryPage = async ({ searchParams }: TechnicalLibraryPageProps) => {
  const ctx = await createRequestContext();

  return (
    <div className='flex flex-col gap-6 w-full'>
      <CallToAction
        title='Biblioteca Técnica'
        description='Manuales, fichas técnicas y documentación de productos'
      >
        <ListToolbar
          searchLabel='Buscar producto'
          searchPlaceholder='Buscar por producto o código...'
        />
      </CallToAction>

      <Suspense fallback={<TechnicalLibrarySkeleton />}>
        <TechnicalLibraryListing ctx={ctx} params={loadListParams(searchParams)} />
      </Suspense>
    </div>
  );
};

export default TechnicalLibraryPage;
