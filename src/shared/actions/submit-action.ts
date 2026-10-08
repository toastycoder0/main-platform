import { toast } from 'sonner';
import { UNEXPECTED_ERROR } from '@/shared/constants/error-messages';
import { isNextRedirect } from '@/shared/errors';
import { fail, ok, type Result } from '@/shared/result';

/**
 * Client counterpart of `executeAction`: same `Promise<Result>` contract, plus
 * the user-facing toast. Callers only read `result.success` and never toast
 * themselves. Redirect rejections count as success; other rejections surface as
 * a generic error.
 */
export async function submitAction(
  action: () => Promise<Result>,
  successMessage?: string,
): Promise<Result> {
  try {
    const result = await action();

    if (!result.success) {
      toast.error(result.error);
    } else if (successMessage) {
      toast.success(successMessage);
    }

    return result;
  } catch (error) {
    if (isNextRedirect(error)) {
      if (successMessage) {
        toast.success(successMessage);
      }
      return ok(undefined);
    }

    toast.error(UNEXPECTED_ERROR);
    return fail(UNEXPECTED_ERROR);
  }
}
