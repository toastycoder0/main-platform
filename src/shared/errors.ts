const ERROR_MAP = {
  unauthorized: { status: 401, defaultMessage: 'Debes iniciar sesión para realizar esta acción' },
  forbidden: { status: 403, defaultMessage: 'No tienes permiso para realizar esta acción' },
  not_found: { status: 404, defaultMessage: 'El recurso solicitado no existe' },
  invalid_input: { status: 400, defaultMessage: 'Los datos enviados no son válidos' },
  internal: { status: 500, defaultMessage: 'Error interno del servidor' },
} as const;

export type ErrorCode = keyof typeof ERROR_MAP;

export class AppError extends Error {
  public readonly status: number;

  constructor(
    public readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? ERROR_MAP[code].defaultMessage);
    this.name = 'AppError';
    this.status = ERROR_MAP[code].status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Detects the internal error thrown by Next.js `redirect()`, matching both the
 * server digest (`NEXT_REDIRECT;/path;307`) and the client one
 * (`NEXT_REDIRECT;push;/path;307;`) rejected by a Server Action promise.
 */
export function isNextRedirect(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) {
    return false;
  }
  return typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT;');
}
