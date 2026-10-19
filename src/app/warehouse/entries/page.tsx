import type { Metadata } from 'next';
import { WarehouseHistoryRoute } from '@/modules/warehouse/components/warehouse-history-route';

export const metadata: Metadata = {
  title: 'Elementos',
};

interface EntriesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function EntriesPage({ searchParams }: EntriesPageProps) {
  return <WarehouseHistoryRoute searchParams={searchParams} view='entries' />;
}
