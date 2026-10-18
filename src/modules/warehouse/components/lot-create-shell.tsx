'use client';

import { useState } from 'react';
import type { LotItemOptionDTO, LotSiblingDTO } from '../application/warehouse.types';
import { LotForm } from './lot-form';
import { LotPageLayout } from './lot-page-layout';
import { LotSiblingsCard } from './lot-siblings-card';

interface LotCreateShellProps {
  itemOptions: LotItemOptionDTO[];
  lots: LotSiblingDTO[];
}

export function LotCreateShell({ itemOptions, lots }: LotCreateShellProps) {
  const [itemId, setItemId] = useState('');

  return (
    <LotPageLayout
      aside={<LotSiblingsCard itemId={itemId} lots={lots} />}
      subtitle='Da de alta un código de lote para un producto con control de inventario.'
      title='Crear lote'
    >
      <LotForm itemOptions={itemOptions} onItemChange={setItemId} />
    </LotPageLayout>
  );
}
