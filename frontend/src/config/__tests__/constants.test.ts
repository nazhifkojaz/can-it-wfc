/**
 * Unit tests for config constants
 */

import { describe, it, expect } from 'vitest';
import { VISIT_TIME, VISIT_TIME_ANALYTICS_MAP } from '../constants';

describe('VISIT_TIME_ANALYTICS_MAP', () => {
  it('maps MORNING (1) to "morning"', () => {
    expect(VISIT_TIME_ANALYTICS_MAP[VISIT_TIME.MORNING]).toBe('morning');
  });

  it('maps AFTERNOON (2) to "afternoon"', () => {
    expect(VISIT_TIME_ANALYTICS_MAP[VISIT_TIME.AFTERNOON]).toBe('afternoon');
  });

  it('maps EVENING (3) to "evening"', () => {
    expect(VISIT_TIME_ANALYTICS_MAP[VISIT_TIME.EVENING]).toBe('evening');
  });

  it('has exactly 3 entries matching VISIT_TIME enum values', () => {
    const keys = Object.keys(VISIT_TIME_ANALYTICS_MAP).map(Number).sort();
    const expected = [VISIT_TIME.MORNING, VISIT_TIME.AFTERNOON, VISIT_TIME.EVENING].sort();
    expect(keys).toEqual(expected);
  });
});
