import { and, eq } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { cart, cartItem } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import { collectSelectionIssues, sanitizeFieldValues } from '@/shared/pricing/selection';
import type { ResolvedCartLine } from '../application/cart.line';
import { MAX_CART_LINES } from '../application/cart.validation';
import { cartConfigHash } from './cart.hash';
import { getCartSources } from './cart.sources.query';

interface StoredLine {
  id: string;
  quantity: number;
}

type Transaction = Parameters<Parameters<RequestContext['db']['transaction']>[0]>[0];

async function applyLine(
  tx: Transaction,
  cartId: string,
  line: ResolvedCartLine,
  stored: Map<string, StoredLine>,
): Promise<number> {
  const configHash = cartConfigHash(line.fields);
  const key = `${line.variant.id}:${configHash}`;
  const current = stored.get(key);
  const quantity = (current?.quantity ?? 0) + line.quantity;
  const issue = collectSelectionIssues(line.variant, quantity, line.fields)[0];

  if (issue) {
    throw new AppError('invalid_input', `${line.source.title}: ${issue.message}`);
  }

  if (current) {
    await tx.update(cartItem).set({ quantity }).where(eq(cartItem.id, current.id));
    current.quantity = quantity;
    return 0;
  }

  const [inserted] = await tx
    .insert(cartItem)
    .values({
      cartId,
      productId: line.source.id,
      variantId: line.variant.id,
      quantity,
      fields: line.fields,
      configHash,
    })
    .returning({ id: cartItem.id, quantity: cartItem.quantity });

  if (inserted) {
    stored.set(key, inserted);
  }

  return 1;
}

/** Adds the trusted lines, merging identical configurations and validating the merged quantity. */
export async function addCartLines(ctx: RequestContext, lines: ResolvedCartLine[]): Promise<void> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    throw new AppError('unauthorized');
  }

  await ctx.db.transaction(async (tx) => {
    await tx.insert(cart).values({ userId }).onConflictDoNothing();
    const [cartRow] = await tx
      .select({ id: cart.id })
      .from(cart)
      .where(eq(cart.userId, userId))
      .for('update');

    if (!cartRow) {
      throw new AppError('internal', 'No se pudo preparar el carrito');
    }

    const existing = await tx
      .select({
        id: cartItem.id,
        variantId: cartItem.variantId,
        configHash: cartItem.configHash,
        quantity: cartItem.quantity,
      })
      .from(cartItem)
      .where(eq(cartItem.cartId, cartRow.id));

    const stored = new Map<string, StoredLine>(
      existing.map((row) => [`${row.variantId}:${row.configHash}`, row]),
    );
    let lineCount = existing.length;

    for (const line of lines) {
      lineCount += await applyLine(tx, cartRow.id, line, stored);

      if (lineCount > MAX_CART_LINES) {
        throw new AppError(
          'invalid_input',
          `El carrito admite hasta ${MAX_CART_LINES} productos distintos`,
        );
      }
    }
  });
}

export async function updateCartItemQuantity(
  ctx: RequestContext,
  itemId: string,
  quantity: number,
): Promise<void> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    throw new AppError('unauthorized');
  }

  const [row] = await ctx.db
    .select({
      id: cartItem.id,
      productId: cartItem.productId,
      variantId: cartItem.variantId,
      fields: cartItem.fields,
    })
    .from(cartItem)
    .innerJoin(cart, eq(cartItem.cartId, cart.id))
    .where(and(eq(cartItem.id, itemId), eq(cart.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError('not_found', 'El producto ya no está en el carrito');
  }

  const [source] = await getCartSources(ctx, [row.productId]);
  const variant = source?.variants.find(
    (candidate) => candidate.id === row.variantId && candidate.isActive,
  );

  if (!source?.isAvailable || !variant) {
    throw new AppError('invalid_input', 'Este producto ya no está disponible');
  }

  const fields = sanitizeFieldValues(variant.openFields, row.fields);
  const issue = collectSelectionIssues(variant, quantity, fields)[0];

  if (issue) {
    throw new AppError('invalid_input', `${source.title}: ${issue.message}`);
  }

  await ctx.db.update(cartItem).set({ quantity }).where(eq(cartItem.id, row.id));
}

export async function removeCartItem(ctx: RequestContext, itemId: string): Promise<void> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    throw new AppError('unauthorized');
  }

  const [row] = await ctx.db
    .select({ id: cartItem.id })
    .from(cartItem)
    .innerJoin(cart, eq(cartItem.cartId, cart.id))
    .where(and(eq(cartItem.id, itemId), eq(cart.userId, userId)))
    .limit(1);

  if (!row) {
    throw new AppError('not_found', 'El producto ya no está en el carrito');
  }

  await ctx.db.delete(cartItem).where(eq(cartItem.id, row.id));
}

export async function clearCart(ctx: RequestContext): Promise<void> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    throw new AppError('unauthorized');
  }

  const [cartRow] = await ctx.db
    .select({ id: cart.id })
    .from(cart)
    .where(eq(cart.userId, userId))
    .limit(1);

  if (cartRow) {
    await ctx.db.delete(cartItem).where(eq(cartItem.cartId, cartRow.id));
  }
}
