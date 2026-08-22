import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold');
  });

  it('handles tailwind conflicts via tailwind-merge', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });
});
