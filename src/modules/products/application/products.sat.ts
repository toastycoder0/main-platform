export interface SatOption {
  label: string;
  value: string;
}

export const SAT_UNIT_OPTIONS: SatOption[] = [
  { value: 'H87', label: 'H87 - Pieza' },
  { value: 'E48', label: 'E48 - Unidad de servicio' },
  { value: 'KGM', label: 'KGM - Kilogramo' },
  { value: 'LTR', label: 'LTR - Litro' },
  { value: 'XBJ', label: 'XBJ - Cubeta' },
  { value: 'MLT', label: 'MLT - Mililitro' },
  { value: 'SA', label: 'SA - Saco' },
  { value: 'GLL', label: 'GLL - Galón' },
  { value: 'KT', label: 'KT - Kit' },
  { value: 'MTK', label: 'MTK - Metro cuadrado' },
  { value: 'MTR', label: 'MTR - Metro lineal' },
];

export const SAT_TAX_OBJECT_OPTIONS: SatOption[] = [
  { value: '01', label: '01 - No objeto de impuesto' },
  { value: '02', label: '02 - Sí objeto de impuesto (Requiere desglose)' },
  { value: '03', label: '03 - Sí objeto de impuesto (No obligado a desglose)' },
  { value: '04', label: '04 - Sí objeto de impuesto (No causa impuesto)' },
];

export const SAT_TAX_NAME_OPTIONS: SatOption[] = [
  { value: 'IVA', label: 'IVA - Impuesto al Valor Agregado' },
  { value: 'ISR', label: 'ISR - Impuesto Sobre la Renta' },
  { value: 'IEPS', label: 'IEPS - Impuesto Especial sobre Producción y Servicios' },
];

export const SAT_DEFAULTS = {
  satUnit: 'H87',
  taxObject: '02',
  taxName: 'IVA',
  taxRate: 16,
} as const;

const SAT_UNIT_VALUES = new Set(SAT_UNIT_OPTIONS.map((option) => option.value));
const SAT_TAX_OBJECT_VALUES = new Set(SAT_TAX_OBJECT_OPTIONS.map((option) => option.value));
const SAT_TAX_NAME_VALUES = new Set(SAT_TAX_NAME_OPTIONS.map((option) => option.value));

export function isSatUnit(value: string): boolean {
  return SAT_UNIT_VALUES.has(value);
}

export function isSatTaxObject(value: string): boolean {
  return SAT_TAX_OBJECT_VALUES.has(value);
}

export function isSatTaxName(value: string): boolean {
  return SAT_TAX_NAME_VALUES.has(value);
}
