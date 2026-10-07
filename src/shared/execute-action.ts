import { toast } from 'sonner';
import type { Result } from '@/shared/result';

/**
 * Ejecuta una Server Action que en éxito redirige.
 *
 * - Fallo (`{ success: false }`): muestra el error y devuelve `false`.
 * - Éxito: `redirect()` rechaza la promesa (la navegación la gestiona Next),
 *   por lo que devolvemos `true`.
 */
export async function executeAction(action: () => Promise<Result>): Promise<boolean> {
  try {
    const result = await action();

    if (result && !result.success) {
      toast.error(result.error);
      return false;
    }

    return true;
  } catch {
    return true;
  }
}
