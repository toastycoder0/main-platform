import { notFound } from 'next/navigation';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { tagParamsSchema } from '@/modules/tags/application/tags.validation';
import { ArchiveTagSection } from '@/modules/tags/components/archive-tag-section';
import { TagForm } from '@/modules/tags/components/tag-form';
import { getTag } from '@/modules/tags/infrastructure/tags.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditTagPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTagPage({ params }: EditTagPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = tagParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (!ctx.permissions.has(PERMISSIONS.admin.tags.edit)) {
    notFound();
  }

  const tag = await getTag(ctx, parsedParams.data.id);

  if (!tag) {
    notFound();
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>Editar etiqueta</h1>
      <TagForm tag={tag} />
      {ctx.permissions.has(PERMISSIONS.admin.tags.delete) ? (
        <ArchiveTagSection tagId={tag.id} tagName={tag.name} />
      ) : null}
    </div>
  );
}
