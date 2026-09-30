const ERROR_MAP = {
  unauthorized: { status: 401, defaultMessage: 'Debes iniciar sesión para realizar esta acción' },
  forbidden: { status: 403, defaultMessage: 'No tienes permiso para realizar esta acción' },
  not_found: { status: 404, defaultMessage: 'El recurso solicitado no existe' },
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
