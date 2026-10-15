import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { technicalAdviceFormSchema } from './technical-advice.validation';

const validData = {
  firstName: 'Carlos',
  lastName: 'Mendoza',
  phone: '5512345678',
  email: 'carlos@example.com',
  message: 'Necesito información sobre recubrimientos.',
};

describe('technicalAdviceFormSchema', () => {
  it('successfully validates a complete and valid form', () => {
    expect(technicalAdviceFormSchema.safeParse(validData).success).toBe(true);
  });

  it('accepts an empty phone', () => {
    expect(technicalAdviceFormSchema.safeParse({ ...validData, phone: '' }).success).toBe(true);
  });

  it('fails validation when first name is empty', () => {
    const result = technicalAdviceFormSchema.safeParse({ ...validData, firstName: '' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.firstName).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when last name is empty', () => {
    const result = technicalAdviceFormSchema.safeParse({ ...validData, lastName: ' ' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.lastName).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when phone is not 10 digits', () => {
    const result = technicalAdviceFormSchema.safeParse({ ...validData, phone: '123' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.phone).toContain(FIELD_ERRORS.phone);
    }
  });

  it('fails validation when email is invalid', () => {
    const result = technicalAdviceFormSchema.safeParse({ ...validData, email: 'not-an-email' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.email).toContain(FIELD_ERRORS.email);
    }
  });

  it('fails validation when message is empty', () => {
    const result = technicalAdviceFormSchema.safeParse({ ...validData, message: '' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.message).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when message exceeds 500 characters', () => {
    const result = technicalAdviceFormSchema.safeParse({
      ...validData,
      message: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.message).toContain(FIELD_ERRORS.tooLong);
    }
  });
});
