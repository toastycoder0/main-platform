import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { OrdersList } from '@/modules/orders/components/orders-list';
import { OrdersSkeleton } from '@/modules/orders/components/orders-skeleton';
import {
  loadOrdersParams,
  serializeOrdersParams,
} from '@/modules/orders/infrastructure/orders.params';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/breadcrumb';

export const metadata: Metadata = { title: 'Mis pedidos' };

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const ctx = await createRequestContext();

  if (!ctx.session) {
    redirect('/auth/login?next=/orders');
  }

  const params = await loadOrdersParams(searchParams);

  return (
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6'>
      <div className='flex flex-col gap-3'>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href='/account'>Mi cuenta</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Mis pedidos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold text-neutral-900'>Mis pedidos</h1>
          <p className='text-sm text-neutral-500'>
            Consulta el estado de tus pedidos, revisa el detalle o repite una compra.
          </p>
        </div>
      </div>

      <Suspense key={serializeOrdersParams(params)} fallback={<OrdersSkeleton />}>
        <OrdersList params={params} />
      </Suspense>
    </div>
  );
}
