import { and, eq, inArray } from 'drizzle-orm';
import { reserveStock } from '@/infrastructure/catalog/stock-reservation.repository';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DbLike } from '@/infrastructure/db';
import { toJson } from '@/infrastructure/db/json';
import { cart, cartItem, order, orderItem, productItem } from '@/infrastructure/db/schema';
import { syncFiles } from '@/infrastructure/files/service';
import { AppError } from '@/shared/errors';
import { buildOrderSnapshot, collectFileKeys } from '../application/checkout.snapshot';
import type { CheckoutStateDTO, CheckoutUser } from '../application/checkout.types';
import type { CheckoutBilling, CheckoutDelivery } from '../application/checkout.validation';

const CART_CHANGED = 'El carrito cambió. Revisa el pedido antes de confirmarlo.';

type DraftColumns = { billing: CheckoutBilling } | { delivery: CheckoutDelivery };

export async function saveCheckoutDraft(
  ctx: RequestContext,
  userId: string,
  draft: DraftColumns,
): Promise<void> {
  const values =
    'billing' in draft ? { billing: toJson(draft.billing) } : { delivery: toJson(draft.delivery) };

  const updated = await ctx.db
    .update(cart)
    .set(values)
    .where(eq(cart.userId, userId))
    .returning({ id: cart.id });

  if (updated.length === 0) {
    throw new AppError('not_found', 'Tu carrito está vacío');
  }
}

export interface CreateOrderInput {
  state: CheckoutStateDTO;
  billing: CheckoutBilling;
  delivery: CheckoutDelivery;
  owner: CheckoutUser;
  actorId: string;
}

async function attachOrderFiles(
  tx: DbLike,
  orderId: string,
  input: CreateOrderInput,
): Promise<void> {
  const keys = collectFileKeys(input.billing, input.delivery);

  for (const [scope, key] of Object.entries(keys)) {
    if (key !== '') {
      await syncFiles(tx, { entity: 'order', scope, ownerId: orderId }, [key], input.actorId);
    }
  }
}

async function reserveOrderStock(
  tx: DbLike,
  orderId: string,
  input: CreateOrderInput,
  lines: { variantId: string; quantity: number; label: string }[],
): Promise<void> {
  const hours = input.delivery.reservationHours;

  if (hours === null) {
    return;
  }

  const managed = await tx
    .select({ id: productItem.id })
    .from(productItem)
    .where(
      and(
        inArray(
          productItem.id,
          lines.map((line) => line.variantId),
        ),
        eq(productItem.managesInventory, true),
      ),
    );
  const managedIds = new Set(managed.map((row) => row.id));

  await reserveStock(tx, {
    lines: lines.filter((line) => managedIds.has(line.variantId)),
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    orderId,
    createdById: input.actorId,
  });
}

/**
 * Turns the cart into an order in one transaction: snapshot, items, optional
 * stock reservation and RFC files. The cart row is locked first, so a double
 * submit finds the cart already emptied and fails instead of duplicating.
 */
export async function createOrderFromCart(
  ctx: RequestContext,
  input: CreateOrderInput,
): Promise<string> {
  const cartId = input.state.cart.id;

  if (!cartId) {
    throw new AppError('invalid_input', CART_CHANGED);
  }

  const orderId = await ctx.db.transaction(async (tx) => {
    await tx.select({ id: cart.id }).from(cart).where(eq(cart.id, cartId)).for('update');

    const items = await tx
      .select({ id: cartItem.id, productId: cartItem.productId, variantId: cartItem.variantId })
      .from(cartItem)
      .where(eq(cartItem.cartId, cartId));
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const lines = input.state.cart.lines.flatMap((line) => {
      const item = itemsById.get(line.id);
      return item ? [{ line, productId: item.productId, variantId: item.variantId }] : [];
    });

    if (items.length !== input.state.cart.lines.length || lines.length !== items.length) {
      throw new AppError('invalid_input', CART_CHANGED);
    }

    const snapshot = buildOrderSnapshot({
      cart: input.state.cart,
      lines,
      billing: input.billing,
      delivery: input.delivery,
      owner: input.owner,
    });

    const [created] = await tx
      .insert(order)
      .values({
        userId: input.owner.id,
        createdById: input.actorId,
        fulfillmentType: snapshot.fulfillmentType,
        billing: toJson(snapshot.billing),
        fulfillment: toJson(snapshot.fulfillment),
        subtotals: toJson(snapshot.subtotals),
        taxes: toJson(snapshot.taxes),
        totals: toJson(snapshot.totals),
        notes: snapshot.notes,
      })
      .returning({ id: order.id });

    if (!created) {
      throw new AppError('internal', 'No se pudo crear el pedido');
    }

    await tx.insert(orderItem).values(
      snapshot.items.map((item) => ({
        ...item,
        orderId: created.id,
        fields: toJson(item.fields),
        price: toJson(item.price),
        tax: item.tax ? toJson(item.tax) : null,
      })),
    );

    await reserveOrderStock(
      tx,
      created.id,
      input,
      lines.map(({ line, variantId }) => ({
        variantId,
        quantity: line.quantity,
        label: line.productTitle,
      })),
    );
    await attachOrderFiles(tx, created.id, input);

    await tx.delete(cartItem).where(eq(cartItem.cartId, cartId));
    await tx.update(cart).set({ billing: null, delivery: null }).where(eq(cart.id, cartId));

    return created.id;
  });

  return orderId;
}
