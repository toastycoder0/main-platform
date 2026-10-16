import { AppError } from '@/shared/errors';
import type { MovementErrorDTO } from './warehouse.types';

// Thrown (never returned) so the surrounding transaction rolls back: a
// returned error value would let the caller commit.
export class MovementRejectedError extends AppError {
  constructor(public readonly errors: readonly MovementErrorDTO[]) {
    super('invalid_input', errors.map((error) => error.message).join('. '));
    this.name = 'MovementRejectedError';
  }
}
