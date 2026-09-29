import { uuidv7 } from 'uuidv7';

export function generateId(prefix: string) {
  return `${prefix}_${uuidv7()}`;
}
