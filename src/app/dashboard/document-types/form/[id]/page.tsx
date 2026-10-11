import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { documentTypeParamsSchema } from '@/modules/document-types/application/document-types.validation';
import { ArchiveDocumentTypeSection } from '@/modules/document-types/components/archive-document-type-section';
import { DocumentTypeForm } from '@/modules/document-types/components/document-type-form';
import { getDocumentType } from '@/modules/document-types/infrastructure/document-types.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditDocumentTypePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDocumentTypePage({ params }: EditDocumentTypePageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = documentTypeParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.documentTypes.edit)) {
    notFound();
  }

  const documentType = await getDocumentType(ctx, parsedParams.data.id);

  if (!documentType) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar tipo de documento</h1>
      <DocumentTypeForm documentType={documentType} />
      {ctx.permissions.has(PERMISSIONS.admin.documentTypes.delete) ? (
        <ArchiveDocumentTypeSection
          documentTypeId={documentType.id}
          documentTypeName={documentType.name}
        />
      ) : null}
    </div>
  );
}
