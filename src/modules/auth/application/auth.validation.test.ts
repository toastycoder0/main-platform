import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordPageSchema,
  resetPasswordSchema,
} from './auth.validation';

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

describe('forgotPasswordSchema', () => {
  it('successfully validates an email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'test@example.com' }).success).toBe(true);
  });

  it('fails validation when email is invalid', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.email).toContain(FIELD_ERRORS.email);
    }
  });
});

describe('resetPasswordSchema', () => {
  it('successfully validates a token and a new password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'new-secret-1',
    });

    expect(result.success).toBe(true);
  });

  it('fails validation when the token is empty', () => {
    const result = resetPasswordSchema.safeParse({ token: '', newPassword: 'new-secret-1' });

    expect(result.success).toBe(false);
  });

  it('fails validation when the new password is shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({ token: 'abc123', newPassword: 'short' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.newPassword).toContain(FIELD_ERRORS.password);
    }
  });
});

describe('resetPasswordPageSchema', () => {
  it('accepts a page with a token', () => {
    expect(resetPasswordPageSchema.safeParse({ token: 'abc123' }).success).toBe(true);
  });

  it('accepts a page with an error from the callback', () => {
    expect(resetPasswordPageSchema.safeParse({ error: 'INVALID_TOKEN' }).success).toBe(true);
  });

  it('accepts an empty page', () => {
    expect(resetPasswordPageSchema.safeParse({}).success).toBe(true);
  });
});
