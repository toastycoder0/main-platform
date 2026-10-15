'use client';

import { ChevronDownIcon, ChevronUpIcon, FileTextIcon } from 'lucide-react';
import { useState } from 'react';
import type { TechnicalLibraryDocumentDTO } from '@/modules/products/application/products.types';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/shared/components/attachment';

const INITIAL_VISIBLE = 4;

interface TechnicalLibraryDocumentListProps {
  documents: TechnicalLibraryDocumentDTO[];
}

export function TechnicalLibraryDocumentList({ documents }: TechnicalLibraryDocumentListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? documents : documents.slice(0, INITIAL_VISIBLE);
  const hasMore = documents.length > INITIAL_VISIBLE;

  return (
    <div className='flex flex-col gap-2 p-4 pt-0 md:p-5 md:pt-0'>
      {visible.map((doc) => (
        <Attachment key={doc.documentId} size='sm'>
          <AttachmentTrigger asChild>
            <a href={doc.fileUrl} target='_blank' rel='noopener noreferrer'>
              <span className='sr-only'>Abrir {doc.label}</span>
            </a>
          </AttachmentTrigger>
          <AttachmentMedia variant='icon'>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{doc.label}</AttachmentTitle>
            {doc.documentTypeName ? (
              <AttachmentDescription>{doc.documentTypeName}</AttachmentDescription>
            ) : null}
          </AttachmentContent>
        </Attachment>
      ))}
      {hasMore ? (
        <button
          type='button'
          onClick={() => setExpanded(!expanded)}
          className='flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800'
        >
          {expanded ? (
            <>
              <ChevronUpIcon className='size-3.5' />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDownIcon className='size-3.5' />
              Ver {documents.length - INITIAL_VISIBLE} m&aacute;s
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
