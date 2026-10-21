'use client';

import { BoxesIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/table';
import type { VariantLotDTO } from '../application/product-details.types';

interface ProductVariantLotsDialogProps {
  variantTitle: string;
  unit: string | null;
  lots: VariantLotDTO[];
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(value);
}

export function ProductVariantLotsDialog({
  variantTitle,
  unit,
  lots,
}: ProductVariantLotsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-auto px-1 text-xs text-neutral-600'
        >
          <BoxesIcon className='size-3.5' />
          Ver lotes
        </Button>
      </DialogTrigger>
      <DialogContent className='z-60' overlayClassName='z-60'>
        <DialogHeader>
          <DialogTitle>Lotes de {variantTitle}</DialogTitle>
          <DialogDescription>Solo se muestran lotes activos con stock.</DialogDescription>
        </DialogHeader>

        {lots.length === 0 ? (
          <p className='text-sm text-neutral-500'>Sin lotes con stock.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className='text-right'>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className='font-mono text-xs'>{lot.code}</TableCell>
                  <TableCell>{unit ?? '—'}</TableCell>
                  <TableCell className='text-right'>{formatQuantity(lot.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
