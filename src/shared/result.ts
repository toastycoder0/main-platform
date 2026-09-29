export type Result<T = void> = { success: true; data: T } | { success: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail(error: string): Result {
  return { success: false, error };
}
