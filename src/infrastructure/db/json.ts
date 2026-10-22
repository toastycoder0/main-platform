/**
 * Shape of any value stored in a jsonb column. Columns typed with it carry no
 * domain type on purpose: readers must parse them with the owning module's Zod
 * schema before use.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Normalizes a DTO into a jsonb value exactly as Postgres will store it. */
export function toJson(value: object): JsonValue {
  return JSON.parse(JSON.stringify(value));
}
