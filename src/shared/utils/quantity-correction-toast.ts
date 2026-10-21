import { toast } from 'sonner';
import {
  MAX_QUANTITY,
  type QuantityAdjustment,
  type QuantityBounds,
} from '@/shared/pricing/selection';

function describeCorrection(
  { correction }: QuantityAdjustment,
  bounds: QuantityBounds,
): string | null {
  switch (correction) {
    case 'minimum':
      return `La cantidad mínima es ${bounds.minOrderQty}.`;
    case 'step':
      return `La cantidad va de ${bounds.incrementQty} en ${bounds.incrementQty} a partir de ${bounds.minOrderQty}.`;
    case 'stock':
      return `Solo hay ${bounds.maxQuantity ?? 0} disponibles.`;
    case 'maximum':
      return `La cantidad máxima es ${MAX_QUANTITY}.`;
    case 'invalid':
      return 'La cantidad ingresada no es válida.';
    default:
      return null;
  }
}

/** Neutral notice (neither success nor error) explaining an automatic quantity fix. */
export function notifyQuantityAdjustment(
  adjustment: QuantityAdjustment,
  bounds: QuantityBounds,
): void {
  const description = describeCorrection(adjustment, bounds);

  if (!description) {
    return;
  }

  toast.info(`Cantidad ajustada a ${adjustment.quantity}`, { description });
}
