'use client';

import { DownloadIcon, FileIcon, FileTextIcon } from 'lucide-react';
import type { TechnicalLibraryDocumentDTO } from '../application/technical-library.types';

function formatIcon(format: string | null) {
  return format === 'PDF' ? FileTextIcon : FileIcon;
}

export function TechnicalLibraryDocumentList({
  documents,
}: {
  documents: TechnicalLibraryDocumentDTO[];
}) {
  return (
    <ul className='flex flex-col gap-0.5'>
      {documents.map((doc) => {
        const Icon = formatIcon(doc.fileFormat);

        return (
          <li key={doc.documentId}>
            <a
              href={doc.fileUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60'
            >
              <Icon className='size-4 shrink-0 text-muted-foreground' />
              <span className='min-w-0 flex-1 truncate font-medium text-foreground'>
                {doc.label}
              </span>
              {doc.documentTypeName ? (
                <span className='hidden shrink-0 text-xs text-muted-foreground sm:inline'>
                  {doc.documentTypeName}
                </span>
              ) : null}
              {doc.fileFormat ? (
                <span className='shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground'>
                  {doc.fileFormat}
                </span>
              ) : null}
              <DownloadIcon
                aria-hidden='true'
                className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground'
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
