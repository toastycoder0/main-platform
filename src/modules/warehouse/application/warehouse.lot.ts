// Uniqueness for lots is enforced on the normalized pair, so the same lot
// cannot be registered twice with different casing or padding.
export function normalizeLotText(value: string): string {
  return value.trim().toLowerCase();
}
