import { and, eq, inArray } from 'drizzle-orm';
import { env } from '@/config/env';
import { db } from '@/infrastructure/db';
import {
  currency,
  documentType,
  exchangeRate,
  permission,
  priceList,
  productUnit,
  role,
  rolePermission,
  user,
  userRole,
} from '@/infrastructure/db/schema';
import { logger } from '@/infrastructure/logger';
import { auth } from '@/modules/auth/infrastructure/auth.config';
import { PERMISSIONS } from '@/shared/constants/permissions';

const { admin } = PERMISSIONS;

const INITIAL_PERMISSIONS = [
  { slug: admin.access, name: 'Acceso al panel de administración', type: 'access' as const },
  { slug: admin.users.access, name: 'Acceso a gestión de usuarios', type: 'access' as const },
  { slug: admin.users.create, name: 'Crear usuarios', type: 'action' as const },
  { slug: admin.users.edit, name: 'Editar usuarios', type: 'action' as const },
  { slug: admin.users.delete, name: 'Eliminar usuarios', type: 'action' as const },
  { slug: admin.users.ban, name: 'Banear usuarios', type: 'action' as const },
  { slug: admin.roles.access, name: 'Acceso a gestión de roles', type: 'access' as const },
  { slug: admin.roles.create, name: 'Crear roles', type: 'action' as const },
  { slug: admin.roles.edit, name: 'Editar roles', type: 'action' as const },
  { slug: admin.files.upload, name: 'Subir archivos', type: 'action' as const },
  {
    slug: admin.categories.access,
    name: 'Acceso a gestión de categorías',
    type: 'access' as const,
  },
  { slug: admin.categories.create, name: 'Crear categorías', type: 'action' as const },
  { slug: admin.categories.edit, name: 'Editar categorías', type: 'action' as const },
  { slug: admin.categories.delete, name: 'Archivar categorías', type: 'action' as const },
  { slug: admin.brands.access, name: 'Acceso a gestión de marcas', type: 'access' as const },
  { slug: admin.brands.create, name: 'Crear marcas', type: 'action' as const },
  { slug: admin.brands.edit, name: 'Editar marcas', type: 'action' as const },
  { slug: admin.brands.delete, name: 'Archivar marcas', type: 'action' as const },
  { slug: admin.tags.access, name: 'Acceso a gestión de etiquetas', type: 'access' as const },
  { slug: admin.tags.create, name: 'Crear etiquetas', type: 'action' as const },
  { slug: admin.tags.edit, name: 'Editar etiquetas', type: 'action' as const },
  { slug: admin.tags.delete, name: 'Archivar etiquetas', type: 'action' as const },
  {
    slug: admin.productUnits.access,
    name: 'Acceso a gestión de unidades de medida',
    type: 'access' as const,
  },
  { slug: admin.productUnits.create, name: 'Crear unidades de medida', type: 'action' as const },
  { slug: admin.productUnits.edit, name: 'Editar unidades de medida', type: 'action' as const },
  {
    slug: admin.productUnits.delete,
    name: 'Archivar unidades de medida',
    type: 'action' as const,
  },
  {
    slug: admin.documentTypes.access,
    name: 'Acceso a gestión de tipos de documento',
    type: 'access' as const,
  },
  { slug: admin.documentTypes.create, name: 'Crear tipos de documento', type: 'action' as const },
  { slug: admin.documentTypes.edit, name: 'Editar tipos de documento', type: 'action' as const },
  {
    slug: admin.documentTypes.delete,
    name: 'Archivar tipos de documento',
    type: 'action' as const,
  },
  { slug: admin.currencies.access, name: 'Acceso a gestión de monedas', type: 'access' as const },
  { slug: admin.currencies.create, name: 'Crear monedas', type: 'action' as const },
  { slug: admin.currencies.edit, name: 'Editar monedas', type: 'action' as const },
  { slug: admin.currencies.delete, name: 'Archivar monedas', type: 'action' as const },
  {
    slug: admin.exchangeRates.access,
    name: 'Acceso a gestión de tipos de cambio',
    type: 'access' as const,
  },
  { slug: admin.exchangeRates.create, name: 'Crear tipos de cambio', type: 'action' as const },
  { slug: admin.exchangeRates.edit, name: 'Editar tipos de cambio', type: 'action' as const },
  {
    slug: admin.exchangeRates.delete,
    name: 'Archivar tipos de cambio',
    type: 'action' as const,
  },
  {
    slug: admin.priceLists.access,
    name: 'Acceso a gestión de listas de precios',
    type: 'access' as const,
  },
  { slug: admin.priceLists.create, name: 'Crear listas de precios', type: 'action' as const },
  { slug: admin.priceLists.edit, name: 'Editar listas de precios', type: 'action' as const },
  {
    slug: admin.priceLists.delete,
    name: 'Eliminar listas de precios',
    type: 'action' as const,
  },
  { slug: admin.products.access, name: 'Acceso a gestión de productos', type: 'access' as const },
  { slug: admin.products.create, name: 'Crear productos', type: 'action' as const },
  { slug: admin.products.edit, name: 'Editar productos', type: 'action' as const },
  { slug: admin.products.delete, name: 'Eliminar productos', type: 'action' as const },
];

const ROLE_SLUG = 'super_admin';
const ROLE_NAME = 'Super Administrador';

async function seedPermissions(): Promise<string[]> {
  const existing = await db
    .select({ slug: permission.slug })
    .from(permission)
    .where(
      inArray(
        permission.slug,
        INITIAL_PERMISSIONS.map((p) => p.slug),
      ),
    );

  const existingSlugs = new Set(existing.map((p) => p.slug));
  const toInsert = INITIAL_PERMISSIONS.filter((p) => !existingSlugs.has(p.slug));

  if (toInsert.length > 0) {
    await db.insert(permission).values(toInsert);
    logger.info({ count: toInsert.length }, 'Permissions created');
  }

  const all = await db
    .select({ id: permission.id, slug: permission.slug })
    .from(permission)
    .where(
      inArray(
        permission.slug,
        INITIAL_PERMISSIONS.map((p) => p.slug),
      ),
    );

  return all.map((p) => p.id);
}

async function seedRole(permissionIds: string[]): Promise<string> {
  let roleId: string;

  const existingRole = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.slug, ROLE_SLUG))
    .limit(1);

  const existingRoleRow = existingRole.at(0);

  if (existingRoleRow) {
    roleId = existingRoleRow.id;
    logger.info({ slug: ROLE_SLUG }, 'Role already exists — reassigning permissions');
    await db.delete(rolePermission).where(eq(rolePermission.roleId, roleId));
  } else {
    const inserted = await db
      .insert(role)
      .values({ slug: ROLE_SLUG, name: ROLE_NAME, sortOrder: 0 })
      .returning({ id: role.id });

    const insertedRow = inserted.at(0);
    if (!insertedRow) {
      throw new Error('Failed to create role');
    }
    roleId = insertedRow.id;
    logger.info({ slug: ROLE_SLUG }, 'Role created');
  }

  if (permissionIds.length > 0) {
    await db
      .insert(rolePermission)
      .values(permissionIds.map((permId) => ({ roleId, permissionId: permId })));
    logger.info({ count: permissionIds.length }, 'Permissions assigned to role');
  }

  return roleId;
}

async function seedAdminUser(roleId: string): Promise<void> {
  const { ADMIN_SEED_EMAIL: email, ADMIN_SEED_PASSWORD: password } = env;

  let userId: string;

  const existingUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  const existingUserRow = existingUser.at(0);

  if (existingUserRow) {
    userId = existingUserRow.id;
    logger.info({ email }, 'Admin user already exists');
  } else {
    const created = await auth.api.createUser({
      body: {
        email,
        password,
        name: 'John',
        data: { lastName: 'Doe' },
        role: 'admin',
      },
    });
    userId = created.user.id;
    logger.info({ email }, 'Admin user created');
  }

  const existingAssignment = await db
    .select({ userId: userRole.userId })
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)))
    .limit(1);

  if (!existingAssignment.at(0)) {
    await db.insert(userRole).values({ userId, roleId });
    logger.info({ email, role: ROLE_SLUG }, 'Admin user assigned to role');
  }
}

async function seed(): Promise<void> {
  const permissionIds = await seedPermissions();
  const roleId = await seedRole(permissionIds);
  await seedAdminUser(roleId);
  await seedCurrencies();
  await seedProductUnits();
  await seedDocumentTypes();
  await seedPriceLists();
}

async function seedCurrencies(): Promise<void> {
  const DEFAULT_CURRENCIES = [
    { code: 'MXN', name: 'Peso Mexicano', decimalDigits: 2, sortOrder: 0 },
    { code: 'USD', name: 'US Dollar', decimalDigits: 2, sortOrder: 1 },
  ];

  for (const c of DEFAULT_CURRENCIES) {
    const [existing] = await db
      .select({ code: currency.code })
      .from(currency)
      .where(eq(currency.code, c.code))
      .limit(1);

    if (!existing) {
      await db.insert(currency).values(c);
      logger.info({ code: c.code }, 'Currency created');
    }
  }

  const [existingRate] = await db
    .select({ id: exchangeRate.id })
    .from(exchangeRate)
    .where(and(eq(exchangeRate.baseCode, 'USD'), eq(exchangeRate.quoteCode, 'MXN')))
    .limit(1);

  if (!existingRate) {
    await db.insert(exchangeRate).values({
      baseCode: 'USD',
      quoteCode: 'MXN',
      rate: '18.0000000000',
      fetchedAt: new Date(),
    });
    logger.info({ pair: 'USD/MXN' }, 'Exchange rate created');
  }
}

const SEED_PRODUCT_UNITS = [
  { slug: 'm2', name: 'Metro cuadrado', abbreviation: 'M2', taxCode: 'MTK' },
  { slug: 'bucket', name: 'Cubeta', abbreviation: 'CUBETA', taxCode: 'XBJ' },
  { slug: 'ml', name: 'Mililitro', abbreviation: 'ML', taxCode: 'MLT' },
  { slug: 'piece', name: 'Pieza', abbreviation: 'PIEZA', taxCode: 'H87' },
  { slug: 'kit', name: 'Kit', abbreviation: 'KIT', taxCode: 'KT' },
  { slug: 'can', name: 'Lata', abbreviation: 'LATA', taxCode: 'H87' },
  { slug: 'bottle', name: 'Botella', abbreviation: 'BOTELLA', taxCode: 'H87' },
  { slug: 'sack', name: 'Saco', abbreviation: 'SACO', taxCode: 'SA' },
  { slug: 'gallon', name: 'Galón', abbreviation: 'GALÓN', taxCode: 'GLL' },
  { slug: 'package', name: 'Paquete', abbreviation: 'PAQUETE', taxCode: 'H87' },
  { slug: 'box', name: 'Caja', abbreviation: 'CAJA', taxCode: 'H87' },
];

async function seedProductUnits(): Promise<void> {
  for (const [i, u] of SEED_PRODUCT_UNITS.entries()) {
    const [existing] = await db
      .select({ id: productUnit.id })
      .from(productUnit)
      .where(eq(productUnit.slug, u.slug))
      .limit(1);

    if (!existing) {
      await db.insert(productUnit).values({
        slug: u.slug,
        name: u.name,
        abbreviation: u.abbreviation,
        taxCode: u.taxCode,
        sortOrder: i,
      });
      logger.info({ slug: u.slug }, 'Product unit created');
    }
  }
}

const SEED_DOCUMENT_TYPES = [
  { slug: 'technical_information', name: 'Información técnica', sortOrder: 1 },
  { slug: 'installation', name: 'Instalación', sortOrder: 2 },
  { slug: 'maintenance', name: 'Mantenimiento', sortOrder: 3 },
  { slug: 'certifications', name: 'Certificaciones', sortOrder: 4 },
  { slug: 'bim_cad_resources', name: 'Recursos BIM y CAD', sortOrder: 5 },
  { slug: 'others', name: 'Otros documentos', sortOrder: 6 },
];

async function seedDocumentTypes(): Promise<void> {
  for (const d of SEED_DOCUMENT_TYPES) {
    const [existing] = await db
      .select({ id: documentType.id })
      .from(documentType)
      .where(eq(documentType.slug, d.slug))
      .limit(1);

    if (!existing) {
      await db.insert(documentType).values({
        slug: d.slug,
        name: d.name,
        sortOrder: d.sortOrder,
      });
      logger.info({ slug: d.slug }, 'Document type created');
    }
  }
}

const SEED_PRICE_LISTS = [
  { slug: 'a', name: 'A', sortOrder: 1, isDefault: true },
  { slug: 'b', name: 'B', sortOrder: 2 },
  { slug: 'c', name: 'C', sortOrder: 3 },
];

async function seedPriceLists(): Promise<void> {
  for (const pl of SEED_PRICE_LISTS) {
    const [existing] = await db
      .select({ id: priceList.id })
      .from(priceList)
      .where(eq(priceList.slug, pl.slug))
      .limit(1);

    if (!existing) {
      await db.insert(priceList).values({
        slug: pl.slug,
        name: pl.name,
        sortOrder: pl.sortOrder,
        isDefault: pl.isDefault,
      });
      logger.info({ slug: pl.slug }, 'Price list created');
    }
  }
}

async function main() {
  try {
    await seed();
    process.exitCode = 0;
  } catch (error) {
    logger.error({ err: error }, 'Seeding failed');
    process.exitCode = 1;
  } finally {
    await db.$client.end();
    process.exit();
  }
}

main();
