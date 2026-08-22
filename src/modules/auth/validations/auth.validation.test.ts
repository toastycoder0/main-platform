import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { loginSchema } from './auth.validation';

describe('loginSchema', () => {
  it('successfully validates a correct email and password', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('fails validation when email is completely empty', () => {
    const invalidData = {
      email: '',
      password: 'password123',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.email).toContain(FIELD_ERRORS.email);
    }
  });

  it('fails validation when email format is invalid', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'password123',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.email).toContain(FIELD_ERRORS.email);
    }
  });

  it('fails validation when password is shorter than 8 characters', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'short',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.password).toContain(FIELD_ERRORS.password);
    }
  });
});
