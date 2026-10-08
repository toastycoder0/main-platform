import { and, eq, inArray } from 'drizzle-orm';
import type { DatabaseClient } from '@/infrastructure/db';
import { userAddress, userTaxProfile } from '@/infrastructure/db/schema';
import { normalizeDefaults } from '../application/users.defaults';
import type { AddressSchema, TaxProfileSchema } from '../application/users.validation';

type DbLike = Pick<DatabaseClient, 'select' | 'insert' | 'update' | 'delete'>;

export type AddressItem = AddressSchema & { id?: string | undefined };
export type TaxProfileItem = TaxProfileSchema & { id?: string | undefined };

function addressValues(userId: string, data: AddressSchema) {
  return {
    userId,
    name: data.name,
    street: data.street,
    exteriorNumber: data.exteriorNumber,
    interiorNumber: data.interiorNumber || null,
    colony: data.colony,
    municipality: data.municipality,
    state: data.state,
    postalCode: data.postalCode,
    phone: data.phone || null,
    isDefault: data.isDefault,
  };
}

function taxProfileValues(userId: string, data: TaxProfileSchema) {
  return {
    userId,
    alias: data.alias,
    legalName: data.legalName,
    rfc: data.rfc,
    cfdiUse: data.cfdiUse,
    taxRegime: data.taxRegime,
    taxPostalCode: data.taxPostalCode,
    rfcUrl: data.rfcUrl || null,
    isDefault: data.isDefault,
  };
}

/**
 * Persiste la colección completa de direcciones del usuario.
 *
 * Upsert preservando IDs: los ids provistos que pertenecen al usuario se
 * actualizan, los que no vienen se eliminan y el resto se insertan. Los ids
 * ajenos se ignoran (se insertan como nuevos), por lo que nunca se toca data
 * de otro usuario.
 */
export async function syncUserAddresses(
  tx: DbLike,
  userId: string,
  items: AddressItem[],
): Promise<void> {
  const normalized = normalizeDefaults(items);
  const existing = await tx
    .select({ id: userAddress.id })
    .from(userAddress)
    .where(eq(userAddress.userId, userId));
  const ownedIds = new Set(existing.map((row) => row.id));

  const keptIds = new Set(
    normalized
      .map((item) => item.id)
      .filter((id): id is string => id !== undefined && ownedIds.has(id)),
  );

  const toDelete = [...ownedIds].filter((id) => !keptIds.has(id));

  if (toDelete.length > 0) {
    await tx
      .delete(userAddress)
      .where(and(eq(userAddress.userId, userId), inArray(userAddress.id, toDelete)));
  }

  for (const item of normalized) {
    if (item.id && ownedIds.has(item.id)) {
      await tx
        .update(userAddress)
        .set(addressValues(userId, item))
        .where(eq(userAddress.id, item.id));
    } else {
      await tx.insert(userAddress).values(addressValues(userId, item));
    }
  }
}

export async function syncUserTaxProfiles(
  tx: DbLike,
  userId: string,
  items: TaxProfileItem[],
): Promise<void> {
  const normalized = normalizeDefaults(items);
  const existing = await tx
    .select({ id: userTaxProfile.id })
    .from(userTaxProfile)
    .where(eq(userTaxProfile.userId, userId));
  const ownedIds = new Set(existing.map((row) => row.id));

  const keptIds = new Set(
    normalized
      .map((item) => item.id)
      .filter((id): id is string => id !== undefined && ownedIds.has(id)),
  );

  const toDelete = [...ownedIds].filter((id) => !keptIds.has(id));

  if (toDelete.length > 0) {
    await tx
      .delete(userTaxProfile)
      .where(and(eq(userTaxProfile.userId, userId), inArray(userTaxProfile.id, toDelete)));
  }

  for (const item of normalized) {
    if (item.id && ownedIds.has(item.id)) {
      await tx
        .update(userTaxProfile)
        .set(taxProfileValues(userId, item))
        .where(eq(userTaxProfile.id, item.id));
    } else {
      await tx.insert(userTaxProfile).values(taxProfileValues(userId, item));
    }
  }
}
