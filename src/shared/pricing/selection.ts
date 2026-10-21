import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import type { OpenFieldDTO, OpenFieldValues } from './types';

export const MAX_QUANTITY = 1_000_000;
export const MAX_SHORT_TEXT = 200;
export const MAX_LONG_TEXT = 1000;

export interface QuantityRules {
  minOrderQty: number;
  incrementQty: number;
}

export interface StockRules {
  managesInventory: boolean;
  availableStock: number | null;
}

export type SelectionVariant = QuantityRules & StockRules & { openFields: OpenFieldDTO[] };

export const STOCK_ERRORS = {
  outOfStock: 'Esta variante está agotada',
  insufficient: 'No hay stock suficiente para esta variante',
} as const;

export function isVariantOutOfStock(variant: StockRules | null | undefined): boolean {
  return Boolean(variant?.managesInventory && (variant.availableStock ?? 0) <= 0);
}

export interface SelectionIssue {
  path: string[];
  message: string;
}

export interface OpenFieldsValidation {
  errors: Record<string, string>;
  numbers: Record<string, number>;
}

export function isValidQuantity(quantity: number, { minOrderQty, incrementQty }: QuantityRules) {
  return (
    Number.isInteger(quantity) &&
    quantity >= minOrderQty &&
    quantity <= MAX_QUANTITY &&
    (quantity - minOrderQty) % incrementQty === 0
  );
}

export function describeQuantityRules({ minOrderQty, incrementQty }: QuantityRules): string {
  return incrementQty > 1
    ? `Mínimo ${minOrderQty}, en múltiplos de ${incrementQty}`
    : `Mínimo ${minOrderQty}`;
}

/** Rounds up to the next valid step so URL-provided quantities never break the variant rules. */
export function snapQuantity(raw: number | null, rules: QuantityRules): number {
  const { minOrderQty, incrementQty } = rules;

  if (raw === null || !Number.isFinite(raw) || raw <= minOrderQty) {
    return minOrderQty;
  }

  const steps = Math.ceil((Math.min(raw, MAX_QUANTITY) - minOrderQty) / incrementQty);
  const snapped = minOrderQty + steps * incrementQty;

  if (snapped <= MAX_QUANTITY) {
    return snapped;
  }

  return minOrderQty + Math.floor((MAX_QUANTITY - minOrderQty) / incrementQty) * incrementQty;
}

export function pickVariant<T extends { id: string }>(
  variants: T[],
  variantId: string | null,
): T | null {
  return variants.find((variant) => variant.id === variantId) ?? variants[0] ?? null;
}

export function sanitizeFieldValues(
  openFields: OpenFieldDTO[],
  raw: OpenFieldValues,
): OpenFieldValues {
  const values: OpenFieldValues = {};

  for (const field of openFields) {
    const value = raw[field.key];

    if (value !== undefined) {
      values[field.key] = value;
    }
  }

  return values;
}

type FieldCheck = { error: string } | { number: number } | { ok: true };

function checkNumber(field: OpenFieldDTO, value: string): FieldCheck {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return { error: 'Ingresa un número válido' };
  }
  if (field.minValue !== null && parsed < field.minValue) {
    return { error: `El valor mínimo es ${field.minValue}` };
  }
  if (field.maxValue !== null && parsed > field.maxValue) {
    return { error: `El valor máximo es ${field.maxValue}` };
  }

  return { number: parsed };
}

function checkField(field: OpenFieldDTO, value: string): FieldCheck {
  switch (field.type) {
    case 'number':
      return checkNumber(field, value);
    case 'select':
      return field.selectOptions.includes(value)
        ? { ok: true }
        : { error: 'Selecciona una opción válida' };
    case 'short_text':
      return value.length > MAX_SHORT_TEXT ? { error: FIELD_ERRORS.tooLong } : { ok: true };
    case 'long_text':
      return value.length > MAX_LONG_TEXT ? { error: FIELD_ERRORS.tooLong } : { ok: true };
  }
}

function checkOptionalField(field: OpenFieldDTO, value: string): FieldCheck {
  if (value !== '') {
    return checkField(field, value);
  }

  return field.isRequired ? { error: FIELD_ERRORS.required } : { ok: true };
}

export function validateOpenFields(
  openFields: OpenFieldDTO[],
  values: OpenFieldValues,
): OpenFieldsValidation {
  const errors: Record<string, string> = {};
  const numbers: Record<string, number> = {};

  for (const field of openFields) {
    const check = checkOptionalField(field, (values[field.key] ?? '').trim());

    if ('error' in check) {
      errors[field.key] = check.error;
    } else if ('number' in check) {
      numbers[field.key] = check.number;
    }
  }

  return { errors, numbers };
}

export function collectSelectionIssues(
  variant: SelectionVariant,
  quantity: number,
  fields: OpenFieldValues,
): SelectionIssue[] {
  const issues: SelectionIssue[] = [];

  if (!isValidQuantity(quantity, variant)) {
    issues.push({ path: ['quantity'], message: describeQuantityRules(variant) });
  }

  if (variant.managesInventory && variant.availableStock !== null) {
    if (variant.availableStock <= 0) {
      issues.push({ path: ['quantity'], message: STOCK_ERRORS.outOfStock });
    } else if (quantity > variant.availableStock) {
      issues.push({ path: ['quantity'], message: STOCK_ERRORS.insufficient });
    }
  }

  for (const [key, message] of Object.entries(
    validateOpenFields(variant.openFields, fields).errors,
  )) {
    issues.push({ path: ['fields', key], message });
  }

  return issues;
}

const quantityBase = z
  .number({ error: FIELD_ERRORS.quantity })
  .int(FIELD_ERRORS.quantity)
  .min(1, FIELD_ERRORS.quantity)
  .max(MAX_QUANTITY, FIELD_ERRORS.quantity);

const fieldValuesSchema = z.record(z.string(), z.string().max(MAX_LONG_TEXT, FIELD_ERRORS.tooLong));

export function buildSelectionSchema(variant: SelectionVariant) {
  return z
    .object({ quantity: quantityBase, fields: fieldValuesSchema })
    .superRefine((data, ctx) => {
      for (const issue of collectSelectionIssues(variant, data.quantity, data.fields)) {
        ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
      }
    });
}

export type SelectionSchema = z.infer<ReturnType<typeof buildSelectionSchema>>;

/** Empty inputs carry no information, so they are dropped before reaching the URL or the server. */
export function pruneEmptyFields(values: OpenFieldValues): OpenFieldValues {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value !== ''),
  );
}
