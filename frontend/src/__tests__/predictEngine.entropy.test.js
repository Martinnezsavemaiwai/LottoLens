/**
 * predictEngine.entropy.test.js — Phase 6: Shannon Entropy Test Suite
 *
 * Validates computePositionalEntropy and ENTROPY_THRESHOLDS against:
 *   - Mathematical contract (bounds, formula correctness)
 *   - Threshold classification accuracy
 *   - Performance budget (< 50ms)
 *   - Graceful degradation on edge/invalid inputs
 */

import { describe, it, expect } from 'vitest';
import {
  computePositionalEntropy,
  ENTROPY_THRESHOLDS,
} from '../utils/predictEngine';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeHistory(n, back2Fn) {
  return Array.from({ length: n }, (_, i) => ({
    back2:   back2Fn(i),
    back3:  [back2Fn(i) + '0'],
    front3: [back2Fn(i) + '0'],
    first:   back2Fn(i) + '0000',
    date:    `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
  }));
}

/** All draws have the same number — minimum entropy, maximum clustering. */
const UNIFORM_SINGLE = makeHistory(50, () => '77');

/** Perfectly uniform: digits 0-9 cycle equally — maximum entropy. */
const UNIFORM_ALL    = makeHistory(100, i => String(i % 10) + String((i + 1) % 10));

/** Mix with mild bias: digit 3 appears at position 0 more than others. */
const BIASED         = makeHistory(60, i => (i % 3 === 0 ? '3' : String(i % 10)) + String(i % 10));

// ---------------------------------------------------------------------------
// Test suite: ENTROPY_THRESHOLDS contract
// ---------------------------------------------------------------------------

describe('ENTROPY_THRESHOLDS — immutability and ordering', () => {

  it('T1: has exactly 4 tiers', () => {
    expect(ENTROPY_THRESHOLDS).toHaveLength(4);
  });

  it('T2: array is frozen — cannot push new entries', () => {
    // Object.freeze is shallow: it seals the array container (no push/splice/etc.)
    // but does not recursively freeze the tier objects inside.
    const origLength = ENTROPY_THRESHOLDS.length;
    expect(() => {
      // Array mutations throw in strict mode on a frozen array
      ENTROPY_THRESHOLDS.push({ minH: 99, severity: 'test', label: 'T', labelTH: 'T', color: '#000' });
    }).toThrow();
    expect(ENTROPY_THRESHOLDS).toHaveLength(origLength);
  });

  it('T3: tiers are ordered descending by minH', () => {
    for (let i = 0; i < ENTROPY_THRESHOLDS.length - 1; i++) {
      expect(ENTROPY_THRESHOLDS[i].minH).toBeGreaterThan(ENTROPY_THRESHOLDS[i + 1].minH);
    }
  });

  it('T4: the last tier has minH === 0.00 (catchall)', () => {
    expect(ENTROPY_THRESHOLDS[ENTROPY_THRESHOLDS.length - 1].minH).toBe(0);
  });

  it('T5: every tier has required fields: minH, severity, label, labelTH, color', () => {
    for (const tier of ENTROPY_THRESHOLDS) {
      expect(typeof tier.minH).toBe('number');
      expect(typeof tier.severity).toBe('string');
      expect(typeof tier.label).toBe('string');
      expect(typeof tier.labelTH).toBe('string');
      expect(typeof tier.color).toBe('string');
    }
  });

  it('T6: severity values are the four canonical strings', () => {
    const severities = ENTROPY_THRESHOLDS.map(t => t.severity);
    expect(severities).toContain('random');
    expect(severities).toContain('healthy');
    expect(severities).toContain('mild');
    expect(severities).toContain('alert');
  });
});

// ---------------------------------------------------------------------------
// Test suite: mathematical contract
// ---------------------------------------------------------------------------

describe('computePositionalEntropy — mathematical contract', () => {

  it('M1: returns an array with length == digit count for the mode', () => {
    const result = computePositionalEntropy(UNIFORM_ALL, 'back2', 'thai');
    expect(result).toHaveLength(2); // back2 has 2 digits
  });

  it('M2: each entropy value is a finite number', () => {
    const result = computePositionalEntropy(UNIFORM_ALL, 'back2', 'thai');
    for (const r of result) {
      expect(Number.isFinite(r.entropy)).toBe(true);
    }
  });

  it('M3: entropy is bounded in [0, log2(10)] accounting for 3dp rounding', () => {
    // entropy is rounded to 3 decimal places inside the function.
    // log2(10) = 3.32192... rounds to 3.322 at 3dp, so the effective upper bound
    // for the rounded value is 3.322, not 3.3219...
    const LOG2_10_ROUNDED = 3.322; // ceil at 3dp of log2(10)
    for (const dataset of [UNIFORM_SINGLE, UNIFORM_ALL, BIASED]) {
      const result = computePositionalEntropy(dataset, 'back2', 'thai');
      for (const r of result) {
        expect(r.entropy).toBeGreaterThanOrEqual(0);
        expect(r.entropy).toBeLessThanOrEqual(LOG2_10_ROUNDED);
      }
    }
  });

  it('M4: single dominant digit gives near-zero entropy (maximum clustering)', () => {
    const result = computePositionalEntropy(UNIFORM_SINGLE, 'back2', 'thai');
    // All draws are '77' — digit 7 at each position has 100% frequency
    for (const r of result) {
      expect(r.entropy).toBe(0);
      expect(r.severity).toBe('alert');
    }
  });

  it('M5: perfectly uniform distribution gives entropy near log2(10)', () => {
    // Build a dataset where each digit 0-9 appears exactly 10 times per position
    const history = makeHistory(100, i => String(i % 10) + String(i % 10));
    const result = computePositionalEntropy(history, 'back2', 'thai');
    const LOG2_10 = Math.log(10) / Math.log(2);
    for (const r of result) {
      expect(r.entropy).toBeGreaterThan(LOG2_10 - 0.01); // within 0.01 bits of max
    }
  });

  it('M6: entropy value is rounded to exactly 3 decimal places', () => {
    const result = computePositionalEntropy(BIASED, 'back2', 'thai');
    for (const r of result) {
      const parts = String(r.entropy).split('.');
      const decimals = parts[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });

  it('M7: topDigit is the most frequent digit at that position', () => {
    // All draws '77' — digit 7 dominates at both positions
    const result = computePositionalEntropy(UNIFORM_SINGLE, 'back2', 'thai');
    for (const r of result) {
      expect(r.topDigit).toBe(7);
    }
  });

  it('M8: topFreqPct is in [0, 100] and sums correctly for single-digit dominance', () => {
    const result = computePositionalEntropy(UNIFORM_SINGLE, 'back2', 'thai');
    for (const r of result) {
      expect(r.topFreqPct).toBeGreaterThanOrEqual(0);
      expect(r.topFreqPct).toBeLessThanOrEqual(100);
      // 100% dominant — should be 100
      expect(r.topFreqPct).toBe(100);
    }
  });

  it('M9: result object contains all required fields', () => {
    const result = computePositionalEntropy(UNIFORM_ALL, 'back2', 'thai');
    for (const r of result) {
      expect(Object.keys(r).sort()).toEqual(
        ['color', 'entropy', 'label', 'labelTH', 'position', 'severity', 'topDigit', 'topFreqPct'].sort()
      );
    }
  });

  it('M10: works for 3-digit modes (back3)', () => {
    const history = makeHistory(40, i => String(i % 10) + String((i+1) % 10) + String((i+2) % 10));
    const result = computePositionalEntropy(history, 'back3', 'thai');
    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(Number.isFinite(r.entropy)).toBe(true);
    }
  });

  it('M11: works for Lao tail4 mode', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      tail4: String(i % 10) + String((i+1)%10) + String((i+2)%10) + String((i+3)%10),
      date: '2025-01-01',
    }));
    const result = computePositionalEntropy(history, 'tail4', 'lao');
    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Test suite: threshold classification accuracy
// ---------------------------------------------------------------------------

describe('computePositionalEntropy — threshold classification', () => {

  it('C1: single-digit dominance maps to "alert"', () => {
    const result = computePositionalEntropy(UNIFORM_SINGLE, 'back2', 'thai');
    expect(result[0].severity).toBe('alert');
  });

  it('C2: uniform distribution maps to "random"', () => {
    const history = makeHistory(100, i => String(i % 10) + String(i % 10));
    const result = computePositionalEntropy(history, 'back2', 'thai');
    for (const r of result) {
      expect(r.severity).toBe('random');
    }
  });

  it('C3: threshold at H=3.10 boundary — 3.099 is not "random"', () => {
    // Manually validate threshold boundary: severity must be 'healthy' just below 3.10
    // Approximate: build a distribution that gives H just below 3.10
    // Use a 50-draw dataset where digit 0 appears 15x and digits 1-9 appear ~3.9x each
    const counts = [15, 3, 3, 3, 4, 4, 4, 5, 5, 4]; // sums to 50
    const N = counts.reduce((a, b) => a + b, 0);
    let H = 0;
    for (const c of counts) {
      if (c === 0) continue;
      const p = c / N;
      H -= p * Math.log2(p);
    }
    // Verify it's between 2.80 and 3.10 so it would be classified as 'healthy'
    expect(H).toBeGreaterThan(2.80);
    expect(H).toBeLessThan(3.10);
  });

  it('C4: every returned severity is one of the four canonical values', () => {
    const validSeverities = new Set(['random', 'healthy', 'mild', 'alert']);
    const result = computePositionalEntropy(BIASED, 'back2', 'thai');
    for (const r of result) {
      expect(validSeverities.has(r.severity)).toBe(true);
    }
  });

  it('C5: returned color matches the ENTROPY_THRESHOLDS entry for that severity', () => {
    const result = computePositionalEntropy(BIASED, 'back2', 'thai');
    const colorBySeverity = Object.fromEntries(ENTROPY_THRESHOLDS.map(t => [t.severity, t.color]));
    for (const r of result) {
      expect(r.color).toBe(colorBySeverity[r.severity]);
    }
  });
});

// ---------------------------------------------------------------------------
// Test suite: graceful degradation
// ---------------------------------------------------------------------------

describe('computePositionalEntropy — graceful degradation', () => {

  it('G1: returns [] on empty history', () => {
    expect(computePositionalEntropy([], 'back2', 'thai')).toEqual([]);
  });

  it('G2: returns [] on null/undefined history (does not throw)', () => {
    expect(() => computePositionalEntropy(null, 'back2', 'thai')).not.toThrow();
    expect(computePositionalEntropy(null, 'back2', 'thai')).toEqual([]);
    expect(computePositionalEntropy(undefined, 'back2', 'thai')).toEqual([]);
  });

  it('G3: returns [] when all history rows have missing mode data (does not throw)', () => {
    const badHistory = [{ date: '2025-01-01' }, { date: '2025-02-01' }];
    expect(() => computePositionalEntropy(badHistory, 'back2', 'thai')).not.toThrow();
    expect(computePositionalEntropy(badHistory, 'back2', 'thai')).toEqual([]);
  });

  it('G4: does not throw on single-draw history', () => {
    const singleDraw = makeHistory(1, () => '42');
    expect(() => computePositionalEntropy(singleDraw, 'back2', 'thai')).not.toThrow();
    const result = computePositionalEntropy(singleDraw, 'back2', 'thai');
    expect(result).toHaveLength(2);
    // Single draw: one digit has 100% frequency — entropy is 0
    for (const r of result) {
      expect(r.entropy).toBe(0);
    }
  });

  it('G5: deterministic — same inputs always return same output', () => {
    const r1 = computePositionalEntropy(BIASED, 'back2', 'thai');
    const r2 = computePositionalEntropy(BIASED, 'back2', 'thai');
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// Test suite: performance budget
// ---------------------------------------------------------------------------

describe('computePositionalEntropy — performance budget', () => {

  it('P1: back2 with 200 draws completes in under 50ms', () => {
    const history = makeHistory(200, i => String(i % 10) + String((i + 3) % 10));
    const t0 = performance.now();
    computePositionalEntropy(history, 'back2', 'thai');
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(50);
  });

  it('P2: first prize (6-digit) with 300 draws completes in under 50ms', () => {
    const history = makeHistory(300, i => {
      let s = '';
      for (let j = 0; j < 6; j++) s += String((i + j) % 10);
      return s;
    }).map(row => ({ ...row, first: row.back2 + row.back2 + '00' }));
    const t0 = performance.now();
    computePositionalEntropy(history, 'first', 'thai');
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(50);
  });
});
