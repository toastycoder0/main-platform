import type { ProductItemOption } from '@/infrastructure/db/schema';
import type { OpenFieldDTO } from '@/shared/pricing/types';

export function toOpenField(option: ProductItemOption): OpenFieldDTO {
  return {
    key: option.key,
    label: option.label,
    type: option.type,
    selectOptions: option.selectOptions ?? [],
    isRequired: option.isRequired,
    minValue: option.minValue ?? null,
    maxValue: option.maxValue ?? null,
    helpText: option.helpText || null,
  };
}
