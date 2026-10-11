import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { DocumentTypeForm } from '@/modules/document-types/components/document-type-form';
import { PERMISSIONS } from '@/shared/constants/permissions';

export default async function NewDocumentTypePage() {
  const ctx = await createRequestContext();

  if (!ctx.permissions.has(PERMISSIONS.admin.documentTypes.create)) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Crear tipo de documento</h1>
      <DocumentTypeForm />
    </div>
  );
}
