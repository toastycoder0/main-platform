import { timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '@/config/env';
import { db } from '@/infrastructure/db';
import { exchangeRate } from '@/infrastructure/db/schema';

const banxicoResponseSchema = z.object({
  bmx: z.object({
    series: z.array(
      z.object({
        datos: z.array(z.object({ fecha: z.string(), dato: z.string() })),
      }),
    ),
  }),
});

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) {
    return false;
  }

  const provided = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(env.CRON_SECRET);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function fetchBanxicoRate(): Promise<number> {
  const res = await fetch(
    'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno',
    { headers: { 'Bmx-Token': env.EXCHANGE_TOKEN } },
  );

  if (!res.ok) {
    throw new Error(`Banxico API responded with ${res.status}`);
  }

  const parsed = banxicoResponseSchema.safeParse(await res.json());

  if (!parsed.success) {
    throw new Error('Respuesta de Banxico inválida');
  }

  const raw = parsed.data.bmx.series[0]?.datos[0]?.dato;

  if (!raw) {
    throw new Error('No se encontró dato de tipo de cambio');
  }

  const rate = Number.parseFloat(raw);

  if (Number.isNaN(rate) || rate <= 0) {
    throw new Error(`Valor de tipo de cambio inválido: ${raw}`);
  }

  return rate;
}

async function upsertUsdMxnRate(rate: number): Promise<void> {
  const [existing] = await db
    .select({ id: exchangeRate.id })
    .from(exchangeRate)
    .where(and(eq(exchangeRate.baseCode, 'USD'), eq(exchangeRate.quoteCode, 'MXN')))
    .limit(1);

  if (existing) {
    await db
      .update(exchangeRate)
      .set({ rate: String(rate), fetchedAt: new Date() })
      .where(eq(exchangeRate.id, existing.id));
  } else {
    await db.insert(exchangeRate).values({
      baseCode: 'USD',
      quoteCode: 'MXN',
      rate: String(rate),
      fetchedAt: new Date(),
    });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const rate = await fetchBanxicoRate();
    await upsertUsdMxnRate(rate);

    return Response.json({ success: true, rate, pair: 'USD/MXN' });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 },
    );
  }
}
