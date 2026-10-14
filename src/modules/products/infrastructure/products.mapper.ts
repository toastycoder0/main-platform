import type { ProductItemOption } from '@/infrastructure/db/schema';
import type { ProductFormSchema } from '../application/products.validation';

type FormOption = ProductFormSchema['variants'][number]['options'][number];

/** Form option -> stored option. Drops attributes that do not apply to the option type. */
export function toItemOption(option: FormOption): ProductItemOption {
  const stored: ProductItemOption = {
    key: option.key,
    label: option.label,
    type: option.type,
    isRequired: option.isRequired,
  };

  if (option.type === 'select') {
    stored.selectOptions = option.selectOptions.map((choice) => choice.value);
  }

  if (option.type === 'number') {
    if (option.minValue != null) {
      stored.minValue = option.minValue;
    }
    if (option.maxValue != null) {
      stored.maxValue = option.maxValue;
    }
  }

  if (option.helpText) {
    stored.helpText = option.helpText;
  }

  return stored;
}

/** Stored option -> form option. */
export function fromItemOption(option: ProductItemOption): FormOption {
  return {
    key: option.key,
    label: option.label,
    type: option.type,
    selectOptions: (option.selectOptions ?? []).map((value) => ({ value })),
    isRequired: option.isRequired,
    minValue: option.minValue ?? null,
    maxValue: option.maxValue ?? null,
    helpText: option.helpText ?? '',
  };
}

/** Numeric columns are returned as strings by the driver. */
export function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

/** Numeric columns are written as strings to avoid float round-trips. */
export function toDecimal(value: number | null | undefined): string | null {
  return value === null || value === undefined ? null : value.toFixed(2);
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
