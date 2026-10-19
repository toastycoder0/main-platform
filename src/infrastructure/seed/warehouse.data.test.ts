import { describe, expect, it } from 'vitest';
import { SEED_WAREHOUSE } from './warehouse.data';

const sections = SEED_WAREHOUSE.sections;
const rows = sections.flatMap((section) => section.rows);
const cells = rows.flatMap((row) => row.cells);

describe('SEED_WAREHOUSE', () => {
  it('matches the production snapshot shape', () => {
    expect(sections).toHaveLength(23);
    expect(rows).toHaveLength(43);
    expect(cells).toHaveLength(517);
  });

  it('uses unique cell codes', () => {
    expect(new Set(cells.map((cell) => cell.code)).size).toBe(cells.length);
  });

  it('uses unique section and row positions', () => {
    expect(new Set(sections.map((section) => section.position)).size).toBe(sections.length);

    for (const section of sections) {
      expect(new Set(section.rows.map((row) => row.position)).size).toBe(section.rows.length);
    }
  });

  it('has positive capacities and contiguous cell positions', () => {
    for (const row of rows) {
      expect(row.cells.length).toBeGreaterThan(0);
      expect(row.cells.map((cell) => cell.position)).toEqual(
        row.cells.map((_, index) => index + 1),
      );

      for (const cell of row.cells) {
        expect(cell.capacity).toBeGreaterThan(0);
      }
    }
  });
});
