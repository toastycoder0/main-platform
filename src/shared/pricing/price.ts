import { evaluateFormula, FormulaError } from './formula';
import { roundMoney } from './money';
import { validateOpenFields } from './selection';
import type { OpenFieldDTO, OpenFieldValues, PriceOutcome, PricingModel } from './types';

export interface PricedVariant {
  pricingModel: PricingModel;
  minOrderQty: number;
  incrementQty: number;
  leadTimeDays: number;
  openFields: OpenFieldDTO[];
}

export interface PriceInput {
  hasSession: boolean;
  baseAmount: number | null;
  cost: number | null;
  variant: PricedVariant;
  formula: string | null;
  quantity: number;
  values: OpenFieldValues;
}

function hasPositiveAmount(amount: number | null): amount is number {
  return amount !== null && amount > 0;
}

function calculateFormulaPrice(input: PriceInput, formula: string): PriceOutcome {
  const { variant, quantity } = input;
  const { errors, numbers } = validateOpenFields(variant.openFields, input.values);

  if (Object.keys(errors).length > 0) {
    return {
      kind: 'incomplete',
      startsAt: hasPositiveAmount(input.baseAmount) ? input.baseAmount : null,
    };
  }

  // Optional numeric fields left blank count as zero so formulas stay evaluable.
  const option = Object.fromEntries(
    variant.openFields
      .filter((field) => field.type === 'number')
      .map((field) => [field.key, numbers[field.key] ?? 0]),
  );

  try {
    const total = roundMoney(
      evaluateFormula(formula, {
        base_price: input.baseAmount ?? 0,
        cost: input.cost ?? 0,
        quantity,
        variant: {
          min_order_qty: variant.minOrderQty,
          increment_qty: variant.incrementQty,
          lead_time_days: variant.leadTimeDays,
        },
        option,
      }),
    );

    return {
      kind: 'priced',
      unitAmount: roundMoney(total / quantity),
      totalAmount: total,
      isFormula: true,
    };
  } catch (error) {
    if (error instanceof FormulaError) {
      return { kind: 'quote' };
    }
    throw error;
  }
}

/**
 * Runs wherever the selection lives: the client uses it for the live preview,
 * the server for the authoritative price stored on each cart line.
 */
export function calculatePrice(input: PriceInput): PriceOutcome {
  if (!input.hasSession) {
    return { kind: 'hidden' };
  }

  if (input.variant.pricingModel === 'formula') {
    return input.formula ? calculateFormulaPrice(input, input.formula) : { kind: 'quote' };
  }

  if (!hasPositiveAmount(input.baseAmount)) {
    return { kind: 'quote' };
  }

  return {
    kind: 'priced',
    unitAmount: input.baseAmount,
    totalAmount: roundMoney(input.baseAmount * input.quantity),
    isFormula: false,
  };
}
