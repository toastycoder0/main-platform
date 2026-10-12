'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currency, exchangeRate } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import {
  createCurrencySchema,
  currencyParamsSchema,
  updateCurrencySchema,
} from '../application/currencies.validation';

const BASE_CODES = new Set(['MXN', 'USD']);

export const createCurrency = run(
  { permission: PERMISSIONS.admin.currencies.create, input: createCurrencySchema },
  async (ctx, { code, name, decimalDigits, isActive }) => {
    const [existing] = await ctx.db
      .select({ code: currency.code })
      .from(currency)
      .where(eq(currency.code, code))
      .limit(1);

    if (existing) {
      throw new AppError('invalid_input', `Ya existe una moneda con el código ${code}`);
    }

    const [row] = await ctx.db
      .select({ value: currency.sortOrder })
      .from(currency)
      .orderBy(currency.sortOrder)
      .limit(1);

    await ctx.db.insert(currency).values({
      code,
      name,
      decimalDigits,
      isActive: isActive ?? true,
      sortOrder: (row?.value ?? 0) + 1,
    });

    revalidatePath('/dashboard/currencies');
    redirect('/dashboard/currencies');
  },
);

export const updateCurrency = run(
  { permission: PERMISSIONS.admin.currencies.edit, input: updateCurrencySchema },
  async (ctx, { code, name, decimalDigits, isActive }) => {
    const [existing] = await ctx.db
      .select({ code: currency.code })
      .from(currency)
      .where(and(eq(currency.code, code), isNull(currency.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db
      .update(currency)
      .set({ name, decimalDigits, isActive: isActive ?? true })
      .where(eq(currency.code, code));

    revalidatePath('/dashboard/currencies');
    redirect('/dashboard/currencies');
  },
);

export const archiveCurrency = run(
  { permission: PERMISSIONS.admin.currencies.delete, input: currencyParamsSchema },
  async (ctx, { code }) => {
    if (BASE_CODES.has(code)) {
      throw new AppError('invalid_input', `No se puede eliminar la moneda ${code}`);
    }

    const [existing] = await ctx.db
      .select({ code: currency.code })
      .from(currency)
      .where(and(eq(currency.code, code), isNull(currency.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    const [rateRow] = await ctx.db
      .select({ id: exchangeRate.id })
      .from(exchangeRate)
      .where(eq(exchangeRate.baseCode, code))
      .limit(1);

    if (rateRow) {
      throw new AppError(
        'invalid_input',
        'No se puede eliminar una moneda con tipos de cambio asociados',
      );
    }

    await ctx.db.update(currency).set({ deletedAt: new Date() }).where(eq(currency.code, code));

    revalidatePath('/dashboard/currencies');
    redirect('/dashboard/currencies');
  },
);
