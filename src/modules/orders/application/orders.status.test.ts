import { describe, expect, it } from 'vitest';
import { buildOrderTimeline } from './orders.status';

describe('buildOrderTimeline', () => {
  it('marks every step up to the current status as reached', () => {
    const timeline = buildOrderTimeline('paid');

    expect(timeline.map((step) => step.status)).toEqual(['pending', 'paid', 'completed']);
    expect(timeline.map((step) => step.reached)).toEqual([true, true, false]);
    expect(timeline.map((step) => step.current)).toEqual([false, true, false]);
  });

  it('keeps pending as the only current step', () => {
    const timeline = buildOrderTimeline('pending');

    expect(timeline.map((step) => step.reached)).toEqual([true, false, false]);
  });

  it('replaces the sequence with the terminal cancelled state', () => {
    expect(buildOrderTimeline('cancelled')).toEqual([
      { status: 'cancelled', label: 'Cancelado', reached: true, current: true },
    ]);
  });
});
