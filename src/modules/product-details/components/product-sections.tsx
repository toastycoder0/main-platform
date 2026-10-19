import { FileTextIcon } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/accordion';
import { Table, TableBody, TableCell, TableRow } from '@/shared/components/table';
import { groupSpecs } from '../application/product-details.specs';
import type { ProductDocumentDTO, ProductSpecDTO } from '../application/product-details.types';

interface ProductSectionsProps {
  description: string | null;
  specs: ProductSpecDTO[];
  documents: ProductDocumentDTO[];
}

function SpecsTable({ specs }: { specs: ProductSpecDTO[] }) {
  return (
    <div className='flex flex-col gap-4'>
      {groupSpecs(specs).map((group) => (
        <div key={group.title ?? 'general'} className='flex flex-col gap-1.5'>
          {group.title ? (
            <h4 className='text-xs font-semibold tracking-wide text-neutral-600 uppercase'>
              {group.title}
            </h4>
          ) : null}
          <div className='rounded-md border bg-neutral-50'>
            <Table>
              <TableBody>
                {group.rows.map((row) => (
                  <TableRow key={`${row.label}:${row.value}`}>
                    <TableCell className='w-1/2 text-neutral-500'>{row.label}</TableCell>
                    <TableCell className='font-medium'>{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsList({ documents }: { documents: ProductDocumentDTO[] }) {
  return (
    <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
      {documents.map((document) => (
        <li key={document.id}>
          <a
            href={document.url}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-3 rounded-lg border border-neutral-200 p-3 text-sm transition-colors hover:bg-neutral-50'
          >
            <FileTextIcon className='size-5 shrink-0 text-neutral-500' aria-hidden='true' />
            <span className='flex min-w-0 flex-col'>
              <span className='line-clamp-2 font-medium text-neutral-900'>{document.label}</span>
              {document.typeName ? (
                <span className='text-xs text-neutral-500'>{document.typeName}</span>
              ) : null}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ProductSections({ description, specs, documents }: ProductSectionsProps) {
  const hasDescription = Boolean(description?.trim());

  if (!hasDescription && specs.length === 0 && documents.length === 0) {
    return null;
  }

  return (
    <Accordion type='multiple' defaultValue={['description']}>
      {hasDescription ? (
        <AccordionItem value='description'>
          <AccordionTrigger>Descripción</AccordionTrigger>
          <AccordionContent>
            <p className='text-sm leading-relaxed whitespace-pre-line text-neutral-700'>
              {description}
            </p>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {specs.length > 0 ? (
        <AccordionItem value='specs'>
          <AccordionTrigger>Detalles</AccordionTrigger>
          <AccordionContent>
            <SpecsTable specs={specs} />
          </AccordionContent>
        </AccordionItem>
      ) : null}

      {documents.length > 0 ? (
        <AccordionItem value='documents'>
          <AccordionTrigger>Documentos</AccordionTrigger>
          <AccordionContent>
            <DocumentsList documents={documents} />
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  );
}
