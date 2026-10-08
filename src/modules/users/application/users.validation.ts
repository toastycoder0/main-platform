import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { isCfdiUse, isFiscalRegime } from './users.cfdi';

export const MAX_ADDRESSES = 10;
export const MAX_TAX_PROFILES = 10;
export const MAX_PERMISSION_OVERRIDES = 50;

function text(max: number) {
  return z.string().trim().min(1, FIELD_ERRORS.required).max(max, FIELD_ERRORS.tooLong);
}

const postalCode = z
  .string()
  .trim()
  .regex(/^\d{5}$/, FIELD_ERRORS.postalCode);

const phone = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{10}$/.test(value), FIELD_ERRORS.phone);

const rfcUrl = z.union([z.literal(''), z.url(FIELD_ERRORS.url)]);

export const userParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

export const addressSchema = z.object({
  name: text(100),
  street: text(150),
  exteriorNumber: text(20),
  interiorNumber: z.string().trim().max(20, FIELD_ERRORS.tooLong),
  colony: text(100),
  municipality: text(100),
  state: text(100),
  postalCode,
  phone,
  isDefault: z.boolean(),
});

const taxProfileBaseSchema = z.object({
  alias: text(100),
  legalName: text(200),
  rfc: z
    .string()
    .trim()
    .min(1, FIELD_ERRORS.required)
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, FIELD_ERRORS.rfc),
  cfdiUse: text(10),
  taxRegime: text(10),
  taxPostalCode: postalCode,
  rfcUrl,
  isDefault: z.boolean(),
});

function refineFiscal(value: { cfdiUse: string; taxRegime: string }, ctx: z.RefinementCtx): void {
  if (!isCfdiUse(value.cfdiUse)) {
    ctx.addIssue({ code: 'custom', path: ['cfdiUse'], message: 'El uso de CFDI no es válido' });
  }

  if (!isFiscalRegime(value.taxRegime)) {
    ctx.addIssue({
      code: 'custom',
      path: ['taxRegime'],
      message: 'El régimen fiscal no es válido',
    });
  }
}

export const taxProfileSchema = taxProfileBaseSchema.superRefine(refineFiscal);

export const accountAddressesSchema = z.object({
  addresses: z.array(addressSchema).max(MAX_ADDRESSES),
});

export const accountTaxProfilesSchema = z.object({
  taxProfiles: z.array(taxProfileSchema).max(MAX_TAX_PROFILES),
});

export const permissionOverrideSchema = z.object({
  permissionId: z.string().min(1, FIELD_ERRORS.required),
  effect: z.enum(['allow', 'deny']),
  expiresAt: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/, FIELD_ERRORS.date),
});

const userFieldsSchema = {
  firstName: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  lastName: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  email: z.email(FIELD_ERRORS.email),
  roleIds: z.array(z.string().min(1, FIELD_ERRORS.required)),
  overrides: z.array(permissionOverrideSchema).max(MAX_PERMISSION_OVERRIDES),
  addresses: z.array(addressSchema).max(MAX_ADDRESSES),
  taxProfiles: z.array(taxProfileSchema).max(MAX_TAX_PROFILES),
};

const passwordField = z.string().trim().min(8, FIELD_ERRORS.password).optional().or(z.literal(''));

export const userFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...userFieldsSchema,
  password: passwordField,
});

export const createUserSchema = z.object({
  ...userFieldsSchema,
  password: passwordField,
});

export const updateUserSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...userFieldsSchema,
});

export const banUserSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  reason: text(500),
  expiresInDays: z
    .number()
    .int('El valor debe ser un número entero')
    .min(1, 'El valor debe ser al menos 1')
    .max(365, 'El valor no puede exceder 365')
    .nullable(),
});

export const adminResetPasswordSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  newPassword: z.string().min(8, FIELD_ERRORS.password).max(128, FIELD_ERRORS.tooLong),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  lastName: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, FIELD_ERRORS.required),
  newPassword: z.string().min(8, FIELD_ERRORS.password).max(128, FIELD_ERRORS.tooLong),
});

export type UserFormSchema = z.infer<typeof userFormSchema>;
export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;
export type AddressSchema = z.infer<typeof addressSchema>;
export type TaxProfileSchema = z.infer<typeof taxProfileSchema>;
export type AccountAddressesSchema = z.infer<typeof accountAddressesSchema>;
export type AccountTaxProfilesSchema = z.infer<typeof accountTaxProfilesSchema>;
export type PermissionOverrideSchema = z.infer<typeof permissionOverrideSchema>;
export type BanUserSchema = z.infer<typeof banUserSchema>;
export type ProfileSchema = z.infer<typeof profileSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
