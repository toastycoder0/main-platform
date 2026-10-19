import type { Metadata } from 'next';
import { WarehouseHistoryRoute } from '@/modules/warehouse/components/warehouse-history-route';

export const metadata: Metadata = {
  title: 'Movimientos',
};

interface MovementsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function MovementsPage({ searchParams }: MovementsPageProps) {
  return <WarehouseHistoryRoute searchParams={searchParams} view='movements' />;
}
