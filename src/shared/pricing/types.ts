export type OpenFieldType = 'short_text' | 'long_text' | 'number' | 'select';

export type PricingModel = 'flat' | 'formula';

export interface OpenFieldDTO {
  key: string;
  label: string;
  type: OpenFieldType;
  selectOptions: string[];
  isRequired: boolean;
  minValue: number | null;
  maxValue: number | null;
  helpText: string | null;
}

export type OpenFieldValues = Record<string, string>;

export type PriceOutcome =
  | { kind: 'hidden' }
  | { kind: 'quote' }
  | { kind: 'incomplete'; startsAt: number | null }
  | { kind: 'priced'; unitAmount: number; totalAmount: number; isFormula: boolean };
