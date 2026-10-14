import type { ProductFormSchema } from './products.validation';

type PriceEntry = ProductFormSchema['prices'][number];

/** One entry per price list, filled with the stored amount when there is one. */
export function buildPriceEntries(
  priceLists: { value: string }[],
  stored: PriceEntry[] = [],
): PriceEntry[] {
  const amounts = new Map(stored.map((entry) => [entry.priceListId, entry.amount]));
  return priceLists.map((priceList) => ({
    priceListId: priceList.value,
    amount: amounts.get(priceList.value) ?? '',
  }));
}
