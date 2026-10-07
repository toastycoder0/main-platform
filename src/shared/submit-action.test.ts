import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UNEXPECTED_ERROR } from '@/shared/constants/error-messages';
import { fail, ok } from '@/shared/result';
import { submitAction } from './submit-action';

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

const toastError = vi.mocked(toast.error);

function createRedirectError(): Error {
  return Object.assign(new Error('NEXT_REDIRECT'), {
    digest: 'NEXT_REDIRECT;push;/dashboard/users;307;',
  });
}

describe('submitAction', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('returns ok and shows no toast when the action succeeds', async () => {
    const result = await submitAction(() => Promise.resolve(ok(undefined)));

    expect(result.success).toBe(true);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('propagates the masked failure and shows its error toast', async () => {
    const failure = fail('No tienes permiso');

    const result = await submitAction(() => Promise.resolve(failure));

    expect(result).toBe(failure);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('No tienes permiso');
  });

  it('treats a Next redirect rejection as success without toasting', async () => {
    const result = await submitAction(() => Promise.reject(createRedirectError()));

    expect(result.success).toBe(true);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('masks unexpected rejections as a generic failure instead of success', async () => {
    const result = await submitAction(() => Promise.reject(new Error('network down')));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(UNEXPECTED_ERROR);
    }
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(UNEXPECTED_ERROR);
  });
});
