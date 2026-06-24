import { describe, it, expect } from 'vitest';
import {
  calculateUnifiedAIPredict,
  computeBayesianPosterior,
  ENGINE_REGISTRY,
  resolveEngineConfig,
} from '../utils/predictEngine';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

/** Minimal config with all four weights non-zero and constraints disabled. */
const BASE_CONFIG = {
  weightPos: 25,
  weightRec: 25,
  weightMarkov: 30,
  weightCooc: 20,
  filterOddEven: false,
  filterHighLow: false,
  blockConsecutive: false,
};

/**
 * Generates a synthetic Thai-lottery draw history of `n` entries.
 * Each entry has `back2` set to a cycling two-digit number so the engine
 * has meaningful frequency data to work with.
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
 * Generates a synthetic Lao-lottery draw history of `n` entries.
 * Each entry has `tail4` cycling through four-digit strings.
 * @param {number} n
 * @returns {Array}
 */
function makeLaoFakeHistory(n) {
  const tails = ['1234', '5678', '9012', '3456', '7890'];
  return Array.from({ length: n }, (_, i) => ({
    tail4: tails[i % tails.length],
    top3: tails[i % tails.length].slice(0, 3),
    top2: tails[i % tails.length].slice(0, 2),
    bottom2: tails[i % tails.length].slice(2, 4),
    date: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
  }));
}

// ---------------------------------------------------------------------------
// Test suite: calculateUnifiedAIPredict — evidence object
// ---------------------------------------------------------------------------

describe('calculateUnifiedAIPredict — evidence object', () => {

  // 1. Schema shape: all five required keys present
  it('returns an evidence object with all required keys on valid history', () => {
    const history = makeThaiFakeHistory(30);
    const result = calculateUnifiedAIPredict(history, 'back2', 'thai', BASE_CONFIG);

    expect(result).toHaveProperty('evidence');
    expect(result.evidence).toHaveProperty('positional');
    expect(result.evidence).toHaveProperty('recency');
    expect(result.evidence).toHaveProperty('markov');
    expect(result.evidence).toHaveProperty('pair');
    expect(result.evidence).toHaveProperty('finalScore');
  });

  // 2. All sub-scores are integers bounded [0, 100]
  it('all evidence sub-scores are integers in the range [0, 100]', () => {
    const history = makeThaiFakeHistory(40);
    const { evidence } = calculateUnifiedAIPredict(history, 'back2', 'thai', BASE_CONFIG);

    for (const [key, val] of Object.entries(evidence)) {
      expect(Number.isInteger(val), `${key} must be an integer`).toBe(true);
      expect(val, `${key} must be >= 0`).toBeGreaterThanOrEqual(0);
      expect(val, `${key} must be <= 100`).toBeLessThanOrEqual(100);
    }
  });

  // 3. Fallback path on empty history — returns evidence with all zeros, no exception
  it('returns evidence object with all zeros when history is empty', () => {
    expect(() => {
      const result = calculateUnifiedAIPredict([], 'back2', 'thai', BASE_CONFIG);
      expect(result.evidence).toEqual({ positional: 0, recency: 0, markov: 0, pair: 0, finalScore: 0 });
    }).not.toThrow();
  });

  // 4. finalScore is non-zero given sufficient history and non-zero weights
  it('produces a non-zero finalScore with sufficient history and non-zero weights', () => {
    const history = makeThaiFakeHistory(50);
    const { evidence } = calculateUnifiedAIPredict(history, 'back2', 'thai', BASE_CONFIG);

    expect(evidence.finalScore).toBeGreaterThan(0);
  });

  // 5. Returns valid evidence for Lao lottery mode (tail4)
  it('produces a well-formed evidence object for Lao lottery tail4 mode', () => {
    const history = makeLaoFakeHistory(30);
    const result = calculateUnifiedAIPredict(history, 'tail4', 'lao', BASE_CONFIG);

    expect(result.evidence).toBeDefined();
    for (const val of Object.values(result.evidence)) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  // 6. No uncaught exception on malformed history rows (missing fields)
  it('does not throw when history rows have missing or null fields', () => {
    const malformedHistory = [
      { back2: null, back3: [], front3: [], first: '' },
      { back2: undefined },
      {},
      { back2: '22', back3: ['123'], front3: ['456'], first: '123456' },
      { back2: '55', back3: ['789'], front3: ['012'], first: '789012' },
    ];

    expect(() => {
      const result = calculateUnifiedAIPredict(malformedHistory, 'back2', 'thai', BASE_CONFIG);
      expect(result).toHaveProperty('evidence');
    }).not.toThrow();
  });

  // 7. Zero weights produce a well-formed evidence object (all sub-scores may be 0)
  it('returns a valid evidence object when all weights are zero', () => {
    const zeroWeightConfig = { ...BASE_CONFIG, weightPos: 0, weightRec: 0, weightMarkov: 0, weightCooc: 0 };
    const history = makeThaiFakeHistory(20);

    expect(() => {
      const result = calculateUnifiedAIPredict(history, 'back2', 'thai', zeroWeightConfig);
      expect(result.evidence).toBeDefined();
      for (const val of Object.values(result.evidence)) {
        expect(Number.isInteger(val)).toBe(true);
      }
    }).not.toThrow();
  });

  // 8. Evidence schema is exact — no extra unexpected keys
  it('evidence object contains exactly the five specified keys', () => {
    const history = makeThaiFakeHistory(25);
    const { evidence } = calculateUnifiedAIPredict(history, 'back2', 'thai', BASE_CONFIG);
    const keys = Object.keys(evidence).sort();
    expect(keys).toEqual(['finalScore', 'markov', 'pair', 'positional', 'recency']);
  });
});

// ---------------------------------------------------------------------------
// Test suite: ENGINE_REGISTRY — immutability and contract
// ---------------------------------------------------------------------------

describe('ENGINE_REGISTRY — immutability and contract', () => {

  // T1. Registry now contains three entries after Phase 5 promotion of v3
  it('T1: contains exactly three registered engines: "v1", "v2", and "v3"', () => {
    expect(ENGINE_REGISTRY.size).toBe(3);
    expect(ENGINE_REGISTRY.has('v1')).toBe(true);
    expect(ENGINE_REGISTRY.has('v2')).toBe(true);
    expect(ENGINE_REGISTRY.has('v3')).toBe(true);
  });

  // T2. Engine v1 weights sum to exactly 1.0 (within float epsilon)
  it('T2: Engine v1 weights sum to 1.0 within floating-point epsilon', () => {
    const { weights } = ENGINE_REGISTRY.get('v1');
    const sum = weights.weightPos + weights.weightRec + weights.weightMarkov + weights.weightCooc;
    expect(Math.abs(sum - 1.0)).toBeLessThan(Number.EPSILON * 10);
  });

  // T3. Engine v1 weights object is frozen — mutation is silently ignored
  it('T3: Engine v1 weights are frozen; mutation attempt leaves constants unchanged', () => {
    const { weights } = ENGINE_REGISTRY.get('v1');
    const original = weights.weightPos;
    // Attempt mutation — should be no-op in sloppy mode, TypeError in strict
    try { weights.weightPos = 9999; } catch { /* swallow strict-mode TypeError */ }
    expect(weights.weightPos).toBe(original);
  });

  // T4. resolveEngineConfig("v1") returns correct integer-percentage weights
  it('T4: resolveEngineConfig("v1") returns integer weights matching the v1 spec (25/25/30/20)', () => {
    const cfg = resolveEngineConfig('v1');
    expect(cfg.weightPos).toBe(25);
    expect(cfg.weightRec).toBe(25);
    expect(cfg.weightMarkov).toBe(30);
    expect(cfg.weightCooc).toBe(20);
    // Confirm all values are proper integers
    for (const [k, v] of Object.entries(cfg)) {
      if (typeof v === 'number') {
        expect(Number.isInteger(v), `${k} must be an integer`).toBe(true);
      }
    }
  });

  // T5. resolveEngineConfig with unknown id falls back to v1 without throwing
  it('T5: resolveEngineConfig("unknown-id") falls back silently to v1 constants', () => {
    let cfg;
    expect(() => { cfg = resolveEngineConfig('unknown-engine-xyz'); }).not.toThrow();
    // Must match v1 output exactly
    const v1Cfg = resolveEngineConfig('v1');
    expect(cfg).toEqual(v1Cfg);
  });

  // T6. resolveEngineConfig("v1") output is compatible with calculateUnifiedAIPredict
  it('T6: resolveEngineConfig("v1") config drives calculateUnifiedAIPredict without error', () => {
    const history = makeThaiFakeHistory(30);
    const config = resolveEngineConfig('v1');
    let result;
    expect(() => { result = calculateUnifiedAIPredict(history, 'back2', 'thai', config); }).not.toThrow();
    expect(result).toHaveProperty('evidence');
    expect(result.evidence.finalScore).toBeGreaterThanOrEqual(0);
  });

  // T7. Engine v2 execution never contaminates v1 constants — strict isolation check
  it('T7: Calling resolveEngineConfig("v2") never alters v1 weight constants', () => {
    // Snapshot v1 weights before v2 is resolved
    const v1Before = { ...ENGINE_REGISTRY.get('v1').weights };

    // Execute v2 config resolution (simulates full pipeline call)
    const v2Cfg = resolveEngineConfig('v2');
    calculateUnifiedAIPredict(makeThaiFakeHistory(20), 'back2', 'thai', v2Cfg);

    // v1 constants must be bit-for-bit identical to the pre-execution snapshot
    const v1After = ENGINE_REGISTRY.get('v1').weights;
    expect(v1After.weightPos).toBe(v1Before.weightPos);
    expect(v1After.weightRec).toBe(v1Before.weightRec);
    expect(v1After.weightMarkov).toBe(v1Before.weightMarkov);
    expect(v1After.weightCooc).toBe(v1Before.weightCooc);
  });

  // T8. Engine v2 resolves without throwing and produces a valid engine config shape
  it('T8: resolveEngineConfig("v2") produces a valid config object without throwing', () => {
    let cfg;
    expect(() => { cfg = resolveEngineConfig('v2'); }).not.toThrow();
    expect(typeof cfg.weightPos).toBe('number');
    expect(typeof cfg.weightRec).toBe('number');
    expect(typeof cfg.weightMarkov).toBe('number');
    expect(typeof cfg.weightCooc).toBe('number');
    expect(typeof cfg.filterOddEven).toBe('boolean');
    expect(typeof cfg.filterHighLow).toBe('boolean');
    expect(typeof cfg.blockConsecutive).toBe('boolean');
  });
});


