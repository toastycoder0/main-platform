import { FileImageIcon } from 'lucide-react';
import type { TechnicalLibraryItemDTO } from '../application/technical-library.types';
import { TechnicalLibraryDocumentList } from './technical-library-document-list';

function Thumbnail({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <picture className='shrink-0'>
        <img alt='' className='size-12 shrink-0 rounded-md object-cover' src={imageUrl} />
      </picture>
    );
  }

  return (
    <div className='flex size-12 shrink-0 items-center justify-center rounded-md bg-muted'>
      <FileImageIcon className='size-5 text-muted-foreground' />
    </div>
  );
}

export function TechnicalLibraryCard({ item }: { item: TechnicalLibraryItemDTO }) {
  return (
    <div className='flex flex-col border-b border-neutral-200/30 py-4'>
      <div className='mb-3 flex items-start gap-3'>
        <Thumbnail imageUrl={item.imageUrl} />
        <div className='min-w-0 flex-1'>
          <h3 className='truncate text-sm font-semibold leading-tight text-foreground'>
            {item.productTitle}
          </h3>
          <p className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground'>
            {item.productCode ? (
              <code className='rounded bg-muted px-1 py-0.5 font-mono text-[10px]'>
                {item.productCode}
              </code>
            ) : null}
            {item.productCategoryName ? (
              <span className='truncate'>{item.productCategoryName}</span>
            ) : null}
          </p>
        </div>
      </div>

      <TechnicalLibraryDocumentList documents={item.documents} />
    </div>
  );
}
