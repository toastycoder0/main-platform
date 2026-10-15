import type { LibraryParams } from '../infrastructure/technical-library.params';
import type { TechnicalLibraryResult } from '../infrastructure/technical-library.query';
import { TechnicalLibraryActiveFilters } from './technical-library-active-filters';
import { TechnicalLibraryCard } from './technical-library-card';
import { TechnicalLibraryEmptyState } from './technical-library-empty-state';
import { TechnicalLibraryFilterDrawer } from './technical-library-filter-drawer';
import { TechnicalLibraryFilters } from './technical-library-filters';
import { TechnicalLibraryPagination } from './technical-library-pagination';

export function TechnicalLibraryLayout({
  result,
  params,
}: {
  result: TechnicalLibraryResult;
  params: LibraryParams;
}) {
  const { items, totalProducts, totalDocuments, filterCounts } = result;

  return (
    <div className='lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8'>
      <aside className='hidden lg:block'>
        <div className='lg:sticky lg:top-6'>
          <TechnicalLibraryFilters filterCounts={filterCounts} />
        </div>
      </aside>

      <div className='flex min-w-0 flex-col gap-5'>
        <div className='flex flex-wrap items-center gap-3'>
          <TechnicalLibraryFilterDrawer filterCounts={filterCounts} />
          <p className='text-sm text-muted-foreground'>
            {totalDocuments} {totalDocuments === 1 ? 'documento' : 'documentos'} en {totalProducts}{' '}
            {totalProducts === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        <TechnicalLibraryActiveFilters filterCounts={filterCounts} />

        {items.length === 0 ? (
          <TechnicalLibraryEmptyState />
        ) : (
          <div className='grid grid-cols-1 gap-x-6 border-t border-neutral-200/30 md:grid-cols-2 xl:grid-cols-3'>
            {items.map((item) => (
              <TechnicalLibraryCard key={item.productId} item={item} />
            ))}
          </div>
        )}

        <TechnicalLibraryPagination params={params} total={totalProducts} />
      </div>
    </div>
  );
}
