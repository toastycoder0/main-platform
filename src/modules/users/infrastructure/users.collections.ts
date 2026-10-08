import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@/infrastructure/db';
import { userAddress, userTaxProfile } from '@/infrastructure/db/schema';
import { normalizeDefaults } from '../application/users.defaults';
import type { AddressSchema, TaxProfileSchema } from '../application/users.validation';

type DbLike = Pick<DatabaseClient, 'insert' | 'delete'>;

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
 * Persists the user's full address collection with replace semantics: deletes
 * the current rows and inserts the submitted ones. Rows are not referenced by
 * id elsewhere (they only prefill forms), so ids are not preserved.
 */
export async function syncUserAddresses(
  tx: DbLike,
  userId: string,
  items: AddressSchema[],
): Promise<void> {
  const normalized = normalizeDefaults(items);

  await tx.delete(userAddress).where(eq(userAddress.userId, userId));

  if (normalized.length > 0) {
    await tx.insert(userAddress).values(normalized.map((item) => addressValues(userId, item)));
  }
}

export async function syncUserTaxProfiles(
  tx: DbLike,
  userId: string,
  items: TaxProfileSchema[],
): Promise<void> {
  const normalized = normalizeDefaults(items);

  await tx.delete(userTaxProfile).where(eq(userTaxProfile.userId, userId));

  if (normalized.length > 0) {
    await tx
      .insert(userTaxProfile)
      .values(normalized.map((item) => taxProfileValues(userId, item)));
  }
}
