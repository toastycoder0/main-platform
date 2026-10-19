import { describe, expect, it } from 'vitest';
import { centeredTransform } from './warehouse.zoom';

describe('centeredTransform', () => {
  it.each([1.5, 4])('centers the content point at scale %s', (scale) => {
    const point = { x: 120, y: 80 };
    const viewport = { width: 800, height: 600 };
    const transform = centeredTransform(point, viewport, scale);

    expect(transform.scale).toBe(scale);
    expect(transform.positionX + point.x * scale).toBe(viewport.width / 2);
    expect(transform.positionY + point.y * scale).toBe(viewport.height / 2);
  });
});
