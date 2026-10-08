import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  accountAddressesSchema,
  accountTaxProfilesSchema,
  addressSchema,
  adminResetPasswordSchema,
  banUserSchema,
  changePasswordSchema,
  createUserSchema,
  MAX_ADDRESSES,
  MAX_TAX_PROFILES,
  permissionOverrideSchema,
  profileSchema,
  taxProfileSchema,
  updateUserSchema,
  userFormSchema,
  userParamsSchema,
} from './users.validation';

const validAddress = {
  name: 'Oficina',
  street: 'Av. Reforma',
  exteriorNumber: '123',
  interiorNumber: '4',
  colony: 'Centro',
  municipality: 'Cuauhtémoc',
  state: 'Ciudad de México',
  postalCode: '06000',
  phone: '5512345678',
  isDefault: true,
};

const validTaxProfile = {
  alias: 'Empresa',
  legalName: 'Mi Empresa S.A. de C.V.',
  rfc: 'ABC123456789',
  cfdiUse: 'G03',
  taxRegime: '601',
  taxPostalCode: '06000',
  rfcUrl: '',
  isDefault: true,
};

const validUserFields = {
  firstName: 'Ana',
  lastName: 'López',
  email: 'ana@example.com',
  roleIds: ['role_1'],
  overrides: [{ permissionId: 'perm_1', effect: 'allow', expiresAt: '' }],
  addresses: [validAddress],
  taxProfiles: [validTaxProfile],
};

describe('addressSchema', () => {
  it('successfully validates a valid address', () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });

  it('allows an empty interior number and phone', () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      interiorNumber: '',
      phone: '',
    });

    expect(result.success).toBe(true);
  });

  it('fails validation when a required text field is empty', () => {
    const result = addressSchema.safeParse({ ...validAddress, street: '   ' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.street).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when postal code is not 5 digits', () => {
    const result = addressSchema.safeParse({ ...validAddress, postalCode: '60' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.postalCode).toContain(FIELD_ERRORS.postalCode);
    }
  });

  it('fails validation when phone is not 10 digits', () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: '123' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.phone).toContain(FIELD_ERRORS.phone);
    }
  });
});

describe('taxProfileSchema', () => {
  it('successfully validates a valid tax profile', () => {
    expect(taxProfileSchema.safeParse(validTaxProfile).success).toBe(true);
  });

  it('fails validation when rfc is invalid', () => {
    const result = taxProfileSchema.safeParse({ ...validTaxProfile, rfc: 'abc' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.rfc).toContain(FIELD_ERRORS.rfc);
    }
  });

  it('fails validation when cfdiUse is not a known catalog value', () => {
    const result = taxProfileSchema.safeParse({ ...validTaxProfile, cfdiUse: 'X99' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.cfdiUse).toContain('El uso de CFDI no es válido');
    }
  });

  it('fails validation when rfcUrl is not a valid url nor a temp key', () => {
    const result = taxProfileSchema.safeParse({ ...validTaxProfile, rfcUrl: 'not-a-url' });

    expect(result.success).toBe(false);
  });
});

describe('permissionOverrideSchema', () => {
  it('successfully validates an override without expiration', () => {
    const result = permissionOverrideSchema.safeParse({
      permissionId: 'perm_1',
      effect: 'deny',
      expiresAt: '',
    });

    expect(result.success).toBe(true);
  });

  it('successfully validates an override with expiration', () => {
    const result = permissionOverrideSchema.safeParse({
      permissionId: 'perm_1',
      effect: 'allow',
      expiresAt: '2026-12-31',
    });

    expect(result.success).toBe(true);
  });

  it('fails validation when effect is invalid', () => {
    const result = permissionOverrideSchema.safeParse({
      permissionId: 'perm_1',
      effect: 'maybe',
      expiresAt: '',
    });

    expect(result.success).toBe(false);
  });

  it('fails validation when expiresAt is malformed', () => {
    const result = permissionOverrideSchema.safeParse({
      permissionId: 'perm_1',
      effect: 'allow',
      expiresAt: '31/12/2026',
    });

    expect(result.success).toBe(false);
  });
});

describe('userFormSchema', () => {
  it('allows a missing id for create mode', () => {
    expect(userFormSchema.safeParse(validUserFields).success).toBe(true);
  });

  it('keeps the id when provided for edit mode', () => {
    const result = userFormSchema.safeParse({ id: 'user_1', ...validUserFields });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.id).toBe('user_1');
    }
  });

  it('fails validation when an id is present but empty', () => {
    const result = userFormSchema.safeParse({ id: '', ...validUserFields });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when email is invalid', () => {
    const result = userFormSchema.safeParse({ ...validUserFields, email: 'no-es-email' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.email).toContain(FIELD_ERRORS.email);
    }
  });

  it('fails validation when roleIds is missing', () => {
    const { roleIds: _roleIds, ...withoutRoles } = validUserFields;
    expect(userFormSchema.safeParse(withoutRoles).success).toBe(false);
  });

  it('allows a user without roles or addresses', () => {
    const result = userFormSchema.safeParse({
      firstName: 'Ana',
      lastName: 'López',
      email: 'ana@example.com',
      roleIds: [],
      overrides: [],
      addresses: [],
      taxProfiles: [],
    });

    expect(result.success).toBe(true);
  });
});

describe('createUserSchema', () => {
  it('allows a missing password', () => {
    expect(createUserSchema.safeParse(validUserFields).success).toBe(true);
  });

  it('allows an empty password', () => {
    const result = createUserSchema.safeParse({ ...validUserFields, password: '' });

    expect(result.success).toBe(true);
  });

  it('allows a valid password', () => {
    const result = createUserSchema.safeParse({ ...validUserFields, password: 'secret123' });

    expect(result.success).toBe(true);
  });

  it('fails validation when password is shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({ ...validUserFields, password: 'secret' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.password).toContain(FIELD_ERRORS.password);
    }
  });
});

describe('updateUserSchema', () => {
  it('successfully validates a valid update', () => {
    const result = updateUserSchema.safeParse({ id: 'user_1', ...validUserFields });

    expect(result.success).toBe(true);
  });

  it('requires a non-empty id', () => {
    const result = updateUserSchema.safeParse({ ...validUserFields, id: '' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });

  it('strips an unexpected password field', () => {
    const result = updateUserSchema.safeParse({
      id: 'user_1',
      ...validUserFields,
      password: 'secret123',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect('password' in result.data).toBe(false);
    }
  });
});

describe('banUserSchema', () => {
  it('successfully validates a permanent ban', () => {
    const result = banUserSchema.safeParse({
      id: 'user_1',
      reason: 'Spam',
      expiresInDays: null,
    });

    expect(result.success).toBe(true);
  });

  it('successfully validates a temporary ban', () => {
    const result = banUserSchema.safeParse({
      id: 'user_1',
      reason: 'Incumplimiento de términos',
      expiresInDays: 30,
    });

    expect(result.success).toBe(true);
  });

  it('fails validation when reason is empty', () => {
    const result = banUserSchema.safeParse({ id: 'user_1', reason: '   ', expiresInDays: null });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.reason).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when expiresInDays is out of range', () => {
    const result = banUserSchema.safeParse({
      id: 'user_1',
      reason: 'Spam',
      expiresInDays: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('adminResetPasswordSchema', () => {
  it('successfully validates a new password', () => {
    expect(
      adminResetPasswordSchema.safeParse({ id: 'user_1', newPassword: 'secret123' }).success,
    ).toBe(true);
  });

  it('fails validation when the new password is too short', () => {
    expect(
      adminResetPasswordSchema.safeParse({ id: 'user_1', newPassword: 'secret' }).success,
    ).toBe(false);
  });
});

describe('profileSchema', () => {
  it('successfully validates profile data', () => {
    expect(profileSchema.safeParse({ firstName: 'Ana', lastName: 'López' }).success).toBe(true);
  });

  it('fails validation when lastName is empty', () => {
    expect(profileSchema.safeParse({ firstName: 'Ana', lastName: '' }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('successfully validates password change data', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'old-secret',
        newPassword: 'new-secret',
      }).success,
    ).toBe(true);
  });

  it('fails validation when currentPassword is empty', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'new-secret' }).success,
    ).toBe(false);
  });

  it('fails validation when newPassword is shorter than 8 characters', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'old-secret', newPassword: 'short' })
        .success,
    ).toBe(false);
  });
});

describe('userParamsSchema', () => {
  it('successfully validates a route id', () => {
    expect(userParamsSchema.safeParse({ id: 'user_1' }).success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    expect(userParamsSchema.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('accountAddressesSchema', () => {
  it('accepts an empty collection', () => {
    expect(accountAddressesSchema.safeParse({ addresses: [] }).success).toBe(true);
  });

  it('accepts a collection up to the maximum', () => {
    const addresses = Array.from({ length: MAX_ADDRESSES }, () => validAddress);
    expect(accountAddressesSchema.safeParse({ addresses }).success).toBe(true);
  });

  it('rejects a collection above the maximum', () => {
    const addresses = Array.from({ length: MAX_ADDRESSES + 1 }, () => validAddress);
    expect(accountAddressesSchema.safeParse({ addresses }).success).toBe(false);
  });

  it('rejects an invalid address item', () => {
    const result = accountAddressesSchema.safeParse({
      addresses: [{ ...validAddress, postalCode: 'nope' }],
    });

    expect(result.success).toBe(false);
  });

  it('strips an unknown key such as a stray id', () => {
    const result = accountAddressesSchema.safeParse({
      addresses: [{ id: 'addr_1', ...validAddress }],
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.addresses.at(0)).not.toHaveProperty('id');
    }
  });
});

describe('accountTaxProfilesSchema', () => {
  it('accepts an empty collection', () => {
    expect(accountTaxProfilesSchema.safeParse({ taxProfiles: [] }).success).toBe(true);
  });

  it('accepts a collection up to the maximum', () => {
    const taxProfiles = Array.from({ length: MAX_TAX_PROFILES }, () => validTaxProfile);
    expect(accountTaxProfilesSchema.safeParse({ taxProfiles }).success).toBe(true);
  });

  it('rejects a collection above the maximum', () => {
    const taxProfiles = Array.from({ length: MAX_TAX_PROFILES + 1 }, () => validTaxProfile);
    expect(accountTaxProfilesSchema.safeParse({ taxProfiles }).success).toBe(false);
  });

  it('applies the fiscal refinements to each item', () => {
    const result = accountTaxProfilesSchema.safeParse({
      taxProfiles: [{ ...validTaxProfile, cfdiUse: 'X99' }],
    });

    expect(result.success).toBe(false);
  });
});
