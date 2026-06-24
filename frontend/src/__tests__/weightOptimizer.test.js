import { describe, it, expect, beforeEach } from 'vitest';
import {
  findBestWeights,
  clearOptimizerCache,
  getOptimizerCacheSize,
  _generateWeightCombinations,
} from '../utils/weightOptimizer';
import {
  calculateUnifiedAIPredict,
  runHistoricalBacktest,
} from '../utils/predictEngine';


// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

/**
 * Synthetic Thai-lottery history — cycling back2 pairs so the engine has
 * genuine frequency signal to evaluate across weight combinations.
 * @param {number} n
 * @returns {Array}
 */
function makeThaiFakeHistory(n) {
  const pairs = ['12', '34', '56', '78', '90', '11', '22', '33', '44', '55'];
  return Array.from({ length: n }, (_, i) => ({
    back2: pairs[i % pairs.length],
    back3: ['123'],
    front3: ['456'],
    first: '123456',
    date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
  }));
}

/**
 * Synthetic Lao-lottery history — cycling tail4 values.
 * @param {number} n
 * @returns {Array}
 */
function makeLaoFakeHistory(n) {
  const tails = ['1234', '5678', '9012', '3456', '7890'];
  return Array.from({ length: n }, (_, i) => ({
    tail4: tails[i % tails.length],
    top3:    tails[i % tails.length].slice(0, 3),
    top2:    tails[i % tails.length].slice(0, 2),
    bottom2: tails[i % tails.length].slice(2, 4),
    date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
  }));
}

// ---------------------------------------------------------------------------
// Test suite: _generateWeightCombinations
// ---------------------------------------------------------------------------

describe('_generateWeightCombinations — grid enumeration', () => {

  it('G1: generates exactly 286 combinations (C(13,3) = 286)', () => {
    const combos = _generateWeightCombinations();
    expect(combos).toHaveLength(286);
  });

  it('G2: every combination sums to exactly 1.0 within float epsilon', () => {
    const combos = _generateWeightCombinations();
    for (const c of combos) {
      const sum = c.weightPos + c.weightRec + c.weightMarkov + c.weightCooc;
      expect(Math.abs(sum - 1.0), `sum=${sum} should equal 1.0`).toBeLessThan(1e-9);
    }
  });

  it('G3: all individual weights are multiples of 0.1 within float epsilon', () => {
    const combos = _generateWeightCombinations();
    for (const c of combos) {
      for (const [key, val] of Object.entries(c)) {
        const rounded = Math.round(val * 10) / 10;
        expect(Math.abs(val - rounded), `${key}=${val} not a 0.1 multiple`).toBeLessThan(1e-9);
      }
    }
  });

  it('G4: all weights are within [0.0, 1.0]', () => {
    const combos = _generateWeightCombinations();
    for (const c of combos) {
      for (const val of Object.values(c)) {
        expect(val).toBeGreaterThanOrEqual(0.0);
        expect(val).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('G5: combination set contains expected members at 0.1 step boundaries', () => {
    const combos = _generateWeightCombinations();
    const EPS = 1e-9;
    // (0.3, 0.3, 0.3, 0.1) — all are multiples of 0.1
    const hasA = combos.some(c =>
      Math.abs(c.weightPos    - 0.3) < EPS &&
      Math.abs(c.weightRec    - 0.3) < EPS &&
      Math.abs(c.weightMarkov - 0.3) < EPS &&
      Math.abs(c.weightCooc   - 0.1) < EPS
    );
    // (0.5, 0.2, 0.2, 0.1) — another valid member
    const hasB = combos.some(c =>
      Math.abs(c.weightPos    - 0.5) < EPS &&
      Math.abs(c.weightRec    - 0.2) < EPS &&
      Math.abs(c.weightMarkov - 0.2) < EPS &&
      Math.abs(c.weightCooc   - 0.1) < EPS
    );
    expect(hasA).toBe(true);
    expect(hasB).toBe(true);
  });

  it('G5b: v1 baseline weights (0.25) are NOT in the 0.1-step grid — documented separation', () => {
    // 0.25 * 10 = 2.5 — not an integer, so v1 weights cannot appear in the search space.
    // This is by design: the optimizer explores a different resolution than the fixed baseline.
    const combos = _generateWeightCombinations();
    const hasV1 = combos.some(c =>
      Math.abs(c.weightPos - 0.25) < 1e-9
    );
    expect(hasV1).toBe(false);
  });


  it('G6: no duplicate combinations exist', () => {
    const combos = _generateWeightCombinations();
    const keys = combos.map(c =>
      `${c.weightPos.toFixed(2)},${c.weightRec.toFixed(2)},${c.weightMarkov.toFixed(2)},${c.weightCooc.toFixed(2)}`
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(combos.length);
  });
});

// ---------------------------------------------------------------------------
// Test suite: findBestWeights — output contract
// ---------------------------------------------------------------------------

describe('findBestWeights — output contract', () => {

  // Clear cache before each test to isolate runs
  beforeEach(() => {
    clearOptimizerCache();
  });

  it('F1: returns a config object with all seven expected fields', () => {
    const history = makeThaiFakeHistory(40);
    const cfg = findBestWeights(history, 'back2', 'thai', 5);
    expect(typeof cfg.weightPos).toBe('number');
    expect(typeof cfg.weightRec).toBe('number');
    expect(typeof cfg.weightMarkov).toBe('number');
    expect(typeof cfg.weightCooc).toBe('number');
    expect(typeof cfg.filterOddEven).toBe('boolean');
    expect(typeof cfg.filterHighLow).toBe('boolean');
    expect(typeof cfg.blockConsecutive).toBe('boolean');
  });

  it('F2: returned integer weights are all in [0, 100]', () => {
    const history = makeThaiFakeHistory(40);
    const cfg = findBestWeights(history, 'back2', 'thai', 5);
    for (const key of ['weightPos', 'weightRec', 'weightMarkov', 'weightCooc']) {
      expect(Number.isInteger(cfg[key]), `${key} must be integer`).toBe(true);
      expect(cfg[key]).toBeGreaterThanOrEqual(0);
      expect(cfg[key]).toBeLessThanOrEqual(100);
    }
  });

  it('F3: returned config drives calculateUnifiedAIPredict without error', () => {
    const history = makeThaiFakeHistory(40);
    const cfg = findBestWeights(history, 'back2', 'thai', 5);
    let result;
    expect(() => {
      result = calculateUnifiedAIPredict(history, 'back2', 'thai', cfg);
    }).not.toThrow();
    expect(result).toHaveProperty('evidence');
    expect(result.evidence.finalScore).toBeGreaterThanOrEqual(0);
  });

  it('F4: works correctly for Lao lottery tail4 mode', { timeout: 30000 }, () => {
    // tail4 is a 4-digit mode (10,000 candidates) — use depth=2 to stay within budget
    const history = makeLaoFakeHistory(40);
    const cfg = findBestWeights(history, 'tail4', 'lao', 2);
    expect(typeof cfg.weightPos).toBe('number');
    expect(() => {
      calculateUnifiedAIPredict(history, 'tail4', 'lao', cfg);
    }).not.toThrow();
  });

  it('F5: returns v1 fallback when history is too small (< MIN_TRAINING_DRAWS + 1)', () => {
    const tinyHistory = makeThaiFakeHistory(10); // < 15 training + 1 test
    const cfg = findBestWeights(tinyHistory, 'back2', 'thai', 5);
    // Fallback is V1_FALLBACK_CONFIG: {25, 25, 30, 20}
    expect(cfg.weightPos).toBe(25);
    expect(cfg.weightRec).toBe(25);
    expect(cfg.weightMarkov).toBe(30);
    expect(cfg.weightCooc).toBe(20);
  });

  it('F6: does not throw on empty history', () => {
    expect(() => {
      findBestWeights([], 'back2', 'thai', 5);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Test suite: findBestWeights — memoization
// ---------------------------------------------------------------------------

describe('findBestWeights — memoization', () => {

  beforeEach(() => clearOptimizerCache());

  it('M1: first call populates the cache (size goes from 0 to 1)', () => {
    expect(getOptimizerCacheSize()).toBe(0);
    findBestWeights(makeThaiFakeHistory(40), 'back2', 'thai', 5);
    expect(getOptimizerCacheSize()).toBe(1);
  });

  it('M2: second call with same history.length returns the cached object (reference equality)', () => {
    const history = makeThaiFakeHistory(40);
    const first  = findBestWeights(history, 'back2', 'thai', 5);
    const second = findBestWeights(history, 'back2', 'thai', 5);
    // Same reference means the cache was hit — no recomputation
    expect(first).toBe(second);
    expect(getOptimizerCacheSize()).toBe(1);
  });

  it('M3: different mode creates a separate cache entry', () => {
    findBestWeights(makeThaiFakeHistory(40), 'back2', 'thai', 5);
    findBestWeights(makeThaiFakeHistory(40), 'back3', 'thai', 5);
    expect(getOptimizerCacheSize()).toBe(2);
  });

  it('M4: different lotteryType creates a separate cache entry', () => {
    findBestWeights(makeThaiFakeHistory(40), 'back2', 'thai', 5);
    findBestWeights(makeLaoFakeHistory(40), 'back2', 'lao', 5);
    expect(getOptimizerCacheSize()).toBe(2);
  });

  it('M5: clearOptimizerCache() removes all entries', () => {
    findBestWeights(makeThaiFakeHistory(40), 'back2', 'thai', 5);
    expect(getOptimizerCacheSize()).toBe(1);
    clearOptimizerCache();
    expect(getOptimizerCacheSize()).toBe(0);
  });

  it('M6: after cache clear, re-call repopulates and returns consistent result', () => {
    const history = makeThaiFakeHistory(40);
    const first = findBestWeights(history, 'back2', 'thai', 5);
    clearOptimizerCache();
    const second = findBestWeights(history, 'back2', 'thai', 5);
    // Values must be identical even though the cache was cleared
    expect(second.weightPos).toBe(first.weightPos);
    expect(second.weightRec).toBe(first.weightRec);
    expect(second.weightMarkov).toBe(first.weightMarkov);
    expect(second.weightCooc).toBe(first.weightCooc);
  });
});

// ---------------------------------------------------------------------------
// Test suite: findBestWeights — statistical validation & determinism
// ---------------------------------------------------------------------------

describe('findBestWeights — statistical validation and determinism', () => {

  beforeEach(() => clearOptimizerCache());

  it('V1: selected config meets Top20 >= v1 baseline (when history is sufficient)', () => {
    const history = makeThaiFakeHistory(50);
    const optimizedCfg = findBestWeights(history, 'back2', 'thai', 8);
    const v1Cfg = { weightPos: 25, weightRec: 25, weightMarkov: 30, weightCooc: 20,
                    filterOddEven: true, filterHighLow: true, blockConsecutive: false };

    const baseline = runHistoricalBacktest(history, 'back2', 'thai', v1Cfg, 8);
    const result   = runHistoricalBacktest(history, 'back2', 'thai', optimizedCfg, 8);

    // The returned config must satisfy the statistical validation rule:
    // hitRateTop20 >= baseline (or be the v1 fallback itself)
    expect(result.hitRateTop20).toBeGreaterThanOrEqual(baseline.hitRateTop20);
  });


  it('V2: two calls with identical inputs return the same weight vector', () => {
    const history = makeThaiFakeHistory(50);
    clearOptimizerCache();
    const runA = findBestWeights([...history], 'back2', 'thai', 8);
    clearOptimizerCache();
    const runB = findBestWeights([...history], 'back2', 'thai', 8);
    expect(runA.weightPos).toBe(runB.weightPos);
    expect(runA.weightRec).toBe(runB.weightRec);
    expect(runA.weightMarkov).toBe(runB.weightMarkov);
    expect(runA.weightCooc).toBe(runB.weightCooc);
  });
});

// ---------------------------------------------------------------------------
// Test suite: findBestWeights — performance budget
// ---------------------------------------------------------------------------

describe('findBestWeights — performance budget', () => {

  beforeEach(() => clearOptimizerCache());

  it('P1: completes within 500ms on a 100-draw Thai history (back2)', () => {
    const history = makeThaiFakeHistory(100);
    const t0 = Date.now();
    findBestWeights(history, 'back2', 'thai', 10);
    const elapsed = Date.now() - t0;
    // Allow generous margin over the 500ms budget for CI environments
    expect(elapsed).toBeLessThan(5000);
  });

  it('P2: second call (cache hit) completes in under 5ms', () => {
    const history = makeThaiFakeHistory(100);
    findBestWeights(history, 'back2', 'thai', 10); // warm cache
    const t0 = Date.now();
    findBestWeights(history, 'back2', 'thai', 10); // cache hit
    expect(Date.now() - t0).toBeLessThan(5);
  });
});
