import type { AppErrorIssue } from './errors';

export type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: readonly AppErrorIssue[] };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail<T = void>(error: string, details?: readonly AppErrorIssue[]): Result<T> {
  return details ? { success: false, error, details } : { success: false, error };
}
