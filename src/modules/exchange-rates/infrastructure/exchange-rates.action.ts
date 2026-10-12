'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exchangeRate } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import {
  createExchangeRateSchema,
  updateExchangeRateSchema,
} from '../application/exchange-rates.validation';

export const createExchangeRate = run(
  { permission: PERMISSIONS.admin.exchangeRates.create, input: createExchangeRateSchema },
  async (ctx, { baseCode, quoteCode, rate, fetchedAt }) => {
    const [existing] = await ctx.db
      .select({ id: exchangeRate.id })
      .from(exchangeRate)
      .where(and(eq(exchangeRate.baseCode, baseCode), eq(exchangeRate.quoteCode, quoteCode)))
      .limit(1);

    if (existing) {
      throw new AppError('invalid_input', 'Ya existe un tipo de cambio para este par');
    }

    await ctx.db.insert(exchangeRate).values({
      baseCode,
      quoteCode,
      rate: String(rate),
      fetchedAt,
    });

    revalidatePath('/dashboard/exchange-rates');
    redirect('/dashboard/exchange-rates');
  },
);

export const updateExchangeRate = run(
  { permission: PERMISSIONS.admin.exchangeRates.edit, input: updateExchangeRateSchema },
  async (ctx, { id, baseCode, quoteCode, rate, fetchedAt }) => {
    const [existing] = await ctx.db
      .select({ id: exchangeRate.id })
      .from(exchangeRate)
      .where(eq(exchangeRate.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db
      .update(exchangeRate)
      .set({ baseCode, quoteCode, rate: String(rate), fetchedAt })
      .where(eq(exchangeRate.id, id));

    revalidatePath('/dashboard/exchange-rates');
    redirect('/dashboard/exchange-rates');
  },
);
