import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { lotParamsSchema } from '@/modules/warehouse/application/warehouse.validation';
import { LotForm } from '@/modules/warehouse/components/lot-form';
import { LotPageLayout } from '@/modules/warehouse/components/lot-page-layout';
import {
  LotSummaryAside,
  LotSummarySkeleton,
} from '@/modules/warehouse/components/lot-summary-aside';
import { getLotById } from '@/modules/warehouse/infrastructure/warehouse.query';
import { PERMISSIONS } from '@/shared/constants/permissions';

interface EditLotPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLotPage({ params }: EditLotPageProps) {
  const [ctx, rawParams] = await Promise.all([createRequestContext(), params]);
  const parsedParams = lotParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  if (
    !ctx.permissions.has(PERMISSIONS.warehouse.access) ||
    !ctx.permissions.has(PERMISSIONS.warehouse.lots.edit)
  ) {
    notFound();
  }

  const lot = await getLotById(ctx, parsedParams.data.id);

  if (!lot) {
    notFound();
  }

  return (
    <LotPageLayout
      aside={
        <Suspense fallback={<LotSummarySkeleton />}>
          <LotSummaryAside lotId={lot.id} />
        </Suspense>
      }
      subtitle='Actualiza la identificación y el estado del lote.'
      title='Editar lote'
    >
      <LotForm lot={lot} />
    </LotPageLayout>
  );
}
