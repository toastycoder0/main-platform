import { and, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import type { RequestContext } from '@/infrastructure/context/types';
import type { JsonValue } from '@/infrastructure/db/json';
import { cart, user } from '@/infrastructure/db/schema';
import { getCart } from '@/modules/cart/infrastructure/cart.query';
import { listUsers } from '@/modules/users/infrastructure/users.query';
import { canCheckout } from '../application/checkout.rules';
import { furthestCheckoutStep } from '../application/checkout.steps';
import type { CheckoutStateDTO, CheckoutUser } from '../application/checkout.types';
import { checkoutBillingSchema, checkoutDeliverySchema } from '../application/checkout.validation';

/** A stored step that no longer matches its schema is treated as incomplete. */
function parseDraft<TSchema extends z.ZodType>(
  ctx: RequestContext,
  schema: TSchema,
  value: JsonValue | null,
  step: string,
): z.output<TSchema> | null {
  if (value === null) {
    return null;
  }

  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    ctx.logger.warn({ step, issues: parsed.error.issues }, 'Discarding invalid checkout draft');
    return null;
  }

  return parsed.data;
}

export async function getCheckoutState(ctx: RequestContext): Promise<CheckoutStateDTO> {
  const userId = ctx.session?.user.id;
  const cartDto = await getCart(ctx);

  const [draft] = userId
    ? await ctx.db
        .select({ billing: cart.billing, delivery: cart.delivery })
        .from(cart)
        .where(eq(cart.userId, userId))
        .limit(1)
    : [];

  const billing = parseDraft(ctx, checkoutBillingSchema, draft?.billing ?? null, 'billing');
  const delivery = parseDraft(ctx, checkoutDeliverySchema, draft?.delivery ?? null, 'delivery');
  const progress = {
    canCheckout: canCheckout(cartDto),
    hasBilling: billing !== null,
    hasDelivery: delivery !== null,
  };

  return {
    cart: cartDto,
    billing,
    delivery,
    progress,
    furthestStep: furthestCheckoutStep(progress),
  };
}

export async function findOrderOwner(
  ctx: RequestContext,
  userId: string,
): Promise<CheckoutUser | null> {
  const [row] = await ctx.db
    .select({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    })
    .from(user)
    .where(and(eq(user.id, userId), isNull(user.deletedAt)))
    .limit(1);

  return row
    ? { id: row.id, name: `${row.firstName} ${row.lastName}`.trim(), email: row.email }
    : null;
}

const OWNER_OPTIONS_LIMIT = 50;

/** Users offered as order owner; always includes the session user and the saved owner. */
export async function listOrderOwnerOptions(
  ctx: RequestContext,
  sessionUser: CheckoutUser,
  selectedId: string | null,
): Promise<CheckoutUser[]> {
  const page = await listUsers(ctx, { q: null, page: 1, pageSize: OWNER_OPTIONS_LIMIT });
  const options: CheckoutUser[] = page.items.map((item) => ({
    id: item.id,
    name: `${item.firstName} ${item.lastName}`.trim(),
    email: item.email,
  }));

  if (!options.some((option) => option.id === sessionUser.id)) {
    options.unshift(sessionUser);
  }

  if (selectedId && !options.some((option) => option.id === selectedId)) {
    const selected = await findOrderOwner(ctx, selectedId);

    if (selected) {
      options.unshift(selected);
    }
  }

  return options;
}
