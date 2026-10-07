import { toast } from 'sonner';
import { UNEXPECTED_ERROR } from '@/shared/constants/error-messages';
import { isNextRedirect } from '@/shared/errors';
import { fail, ok, type Result } from '@/shared/result';

/**
 * Ejecuta una Server Action desde el cliente.
 *
 * Espejo de `executeAction` (`infrastructure/services/action.ts`): mismo contrato
 * `Promise<Result>`. El error ya se muestra vía toast, así que el caller solo
 * debe leer `result.success` y nunca repetir el toast.
 *
 * - `fail` → la action devolvió un error ya enmascarado; se muestra y se propaga.
 * - `ok` → éxito. Si la action llamó a `redirect()`, Next ya inició la navegación
 *   y el rechazo de la promesa se absorbe aquí.
 * - Rechazo que no es un redirect (red, serialización) → toast genérico;
 *   nunca reporta éxito.
 */
export async function submitAction(action: () => Promise<Result>): Promise<Result> {
  try {
    const result = await action();

    if (!result.success) {
      toast.error(result.error);
    }

    return result;
  } catch (error) {
    if (isNextRedirect(error)) {
      return ok(undefined);
    }

    toast.error(UNEXPECTED_ERROR);
    return fail(UNEXPECTED_ERROR);
  }
}
