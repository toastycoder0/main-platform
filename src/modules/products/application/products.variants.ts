import { slugify } from '@/shared/utils/slug';
import type { ProductFormSchema } from './products.validation';

export const MAX_VARIANTS = 20;
export const MAX_VARIANT_OPTIONS = 20;
export const MAX_SELECT_CHOICES = 50;

export const OPTION_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export const VARIANT_OPTION_TYPES = ['short_text', 'long_text', 'number', 'select'] as const;
export const VARIANT_PRICING_MODELS = ['flat', 'formula'] as const;

export const VARIANT_OPTION_TYPE_LABELS: Record<(typeof VARIANT_OPTION_TYPES)[number], string> = {
  short_text: 'Texto corto',
  long_text: 'Texto largo',
  number: 'Número',
  select: 'Lista de opciones',
};

export const VARIANT_PRICING_MODEL_LABELS: Record<(typeof VARIANT_PRICING_MODELS)[number], string> =
  {
    flat: 'Precio base del producto',
    formula: 'Fórmula personalizada',
  };

type ProductVariantValues = ProductFormSchema['variants'][number];
type ProductVariantOptionValues = ProductVariantValues['options'][number];

export function createEmptyVariantOption(): ProductVariantOptionValues {
  return {
    key: '',
    label: '',
    type: 'short_text',
    selectOptions: [],
    isRequired: false,
    minValue: null,
    maxValue: null,
    helpText: '',
  };
}

export function createEmptyVariant(title = ''): ProductVariantValues {
  return {
    clientId: crypto.randomUUID(),
    title,
    code: '',
    unitId: null,
    isActive: true,
    managesInventory: true,
    minOrderQty: 1,
    incrementQty: 1,
    leadTimeDays: 0,
    pricingModel: 'flat',
    priceFormula: '',
    options: [],
  };
}

export function createDefaultVariant(): ProductVariantValues {
  return createEmptyVariant('Estándar');
}

export function toOptionKey(label: string): string {
  const key = slugify(label).replaceAll('-', '_');
  return /^[0-9]/.test(key) ? `opcion_${key}` : key;
}

export type FormulaVariableGroup = 'product' | 'variant' | 'option';

export interface FormulaVariable {
  token: string;
  label: string;
  group: FormulaVariableGroup;
}

export const FORMULA_VARIABLE_GROUP_LABELS: Record<FormulaVariableGroup, string> = {
  product: 'Producto',
  variant: 'Variante',
  option: 'Opciones',
};

const BASE_FORMULA_VARIABLES: FormulaVariable[] = [
  { token: 'base_price', label: 'Precio base del producto', group: 'product' },
  { token: 'cost', label: 'Costo del producto', group: 'product' },
  { token: 'quantity', label: 'Cantidad solicitada', group: 'product' },
  { token: 'variant.min_order_qty', label: 'Cantidad mínima de la variante', group: 'variant' },
  { token: 'variant.increment_qty', label: 'Incremento de la variante', group: 'variant' },
  { token: 'variant.lead_time_days', label: 'Días de entrega de la variante', group: 'variant' },
];

export function getFormulaVariables(
  options: Pick<ProductVariantOptionValues, 'key' | 'label'>[],
): FormulaVariable[] {
  const optionVariables = options
    .filter((option) => OPTION_KEY_PATTERN.test(option.key))
    .map<FormulaVariable>((option) => ({
      token: `option.${option.key}`,
      label: option.label.trim() || option.key,
      group: 'option',
    }));

  return [...BASE_FORMULA_VARIABLES, ...optionVariables];
}

export function insertAtSelection(
  text: string,
  token: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; caret: number } {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  return {
    value: text.slice(0, start) + token + text.slice(end),
    caret: start + token.length,
  };
}
