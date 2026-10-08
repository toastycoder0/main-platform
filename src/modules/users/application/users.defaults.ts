export function normalizeDefaults<T extends { isDefault: boolean }>(items: T[]): T[] {
  let foundDefault = false;

  return items.map((item) => {
    if (!item.isDefault || foundDefault) {
      return item.isDefault ? { ...item, isDefault: false } : item;
    }

    foundDefault = true;
    return item;
  });
}
