/**
 * weightOptimizer.js — Deterministic Brute-Force Grid Search Weight Optimizer
 *
 * Finds the optimal weight configuration for the UnifiedAIPredict scoring engine
 * by exhaustively evaluating all combinations of four weights (step=0.1, sum=1.0)
 * against real historical draw data, maximising the Top-20 hit rate.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * PORTABILITY NOTICE
 * This module is intentionally written as a pure utility with zero React,
 * DOM, or browser-specific dependencies. The only platform boundaries are:
 *   • Date.now()   → Go equivalent: time.Now().UnixMilli()
 *   • console.log  → Go equivalent: structured log (zap / slog)
 * All core mathematical logic (loops, arithmetic, selection) requires no
 * alteration when porting to a Go backend.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * @module weightOptimizer
 */

import { runHistoricalBacktest } from './predictEngine.js';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Grid search step size and bounds.
 * STEPS = 1.0 / GRID_STEP = 10 integer units.
 * Each weight ranges over {0, 1, 2, …, 10} / 10 = {0.0, 0.1, …, 1.0}.
 * Valid combinations: C(STEPS + 3, 3) = C(13, 3) = 286.
 */
const GRID_STEP = 0.1;
const STEPS     = Math.round(1.0 / GRID_STEP); // 10

/**
 * Maximum backtest depth used internally by the optimizer.
 *
 * Caps the sampleDepth parameter to enforce the performance budget:
 *   ≤ 500 ms on 100-draw history   (286 combos × 10 depth × ~sub-ms/call)
 *   ≤ 2 s   on 300-draw history
 *
 * Increasing this trades accuracy for runtime. Do not exceed 20 without
 * profiling against the target history length and prize mode.
 */
const OPTIMIZER_MAX_DEPTH = 10;

/**
 * Minimum training draws required before the optimizer will attempt a search.
 * Must be > 0 and should match predictEngine's `minTrainingDraws`.
 */
const MIN_TRAINING_DRAWS = 15;

/**
 * Structural constraint defaults inherited from Engine v1.
 * The optimizer searches only weight space; constraints are held constant.
 */
const V1_CONSTRAINTS = Object.freeze({
  filterOddEven:    true,
  filterHighLow:    true,
  blockConsecutive: false,
});

/**
 * Engine v1 baseline config in integer-percentage format.
 * Used as both the comparison baseline and the fallback return value.
 */
const V1_FALLBACK_CONFIG = Object.freeze({
  weightPos:    25,
  weightRec:    25,
  weightMarkov: 30,
  weightCooc:   20,
  ...V1_CONSTRAINTS,
});

// =============================================================================
// MEMOIZATION CACHE
// =============================================================================

/**
 * Module-level optimisation cache.
 * Key format: `${history.length}:${mode}:${lotteryType}`
 *
 * A hit is returned immediately without re-running the grid search.
 * The cache is invalidated only when the raw history array length changes,
 * matching the spec: "Do not recompute unless the raw history array length shifts."
 *
 * @type {Map<string, Object>}
 */
const _cache = new Map();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Generate all valid four-weight combinations where each weight is an integer
 * multiple of GRID_STEP and the four values sum to exactly 1.0.
 *
 * Implementation uses three nested loops with the fourth weight derived
 * algebraically (d = STEPS - a - b - c), which is strictly equivalent to
 * four nested loops with a sum-equality filter — but avoids 14,641 − 286 = 14,355
 * wasted iterations and eliminates floating-point sum-comparison errors.
 *
 * @internal Exported for unit-testing purposes only.
 * @returns {Array<{weightPos: number, weightRec: number, weightMarkov: number, weightCooc: number}>}
 *          Exactly C(STEPS + 3, 3) = 286 entries when STEPS = 10.
 */
export function _generateWeightCombinations() {
  const combinations = [];

  for (let a = 0; a <= STEPS; a++) {
    for (let b = 0; b <= STEPS - a; b++) {
      for (let c = 0; c <= STEPS - a - b; c++) {
        // d is fully determined by the sum constraint — always ≥ 0
        const d = STEPS - a - b - c;
        combinations.push({
          weightPos:    a / STEPS,
          weightRec:    b / STEPS,
          weightMarkov: c / STEPS,
          weightCooc:   d / STEPS,
        });
      }
    }
  }

  return combinations;
}

/**
 * Convert a fractional weight descriptor {0…1} into the integer-percentage
 * config shape consumed by calculateUnifiedAIPredict / runHistoricalBacktest.
 * Constraint fields are inherited from V1_CONSTRAINTS.
 *
 * @param {{ weightPos: number, weightRec: number, weightMarkov: number, weightCooc: number }} weights
 * @returns {{ weightPos, weightRec, weightMarkov, weightCooc,
 *             filterOddEven, filterHighLow, blockConsecutive }}
 */
function toEngineConfig(weights) {
  return {
    weightPos:    Math.round(weights.weightPos    * 100),
    weightRec:    Math.round(weights.weightRec    * 100),
    weightMarkov: Math.round(weights.weightMarkov * 100),
    weightCooc:   Math.round(weights.weightCooc   * 100),
    filterOddEven:    V1_CONSTRAINTS.filterOddEven,
    filterHighLow:    V1_CONSTRAINTS.filterHighLow,
    blockConsecutive: V1_CONSTRAINTS.blockConsecutive,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * findBestWeights — Deterministic brute-force Grid Search optimiser.
 *
 * Searches all 286 valid weight combinations (step=0.1, sum=1.0) and returns
 * the configuration that maximises the Top-20 hit rate over `sampleDepth`
 * historical draws. Ties are broken by the higher Top-10 hit rate.
 *
 * ── Statistical Validation ────────────────────────────────────────────────
 * A candidate configuration is only eligible if BOTH conditions hold vs the
 * Engine v1 baseline:
 *   1. hitRateTop20 ≥ baseline.hitRateTop20
 *   2. hitRateTop10 ≥ baseline.hitRateTop10 − 5   (max 5 pp regression)
 *
 * If no combination passes validation, Engine v1 weights are returned as a
 * safe fallback. This prevents regression from a noisy / small dataset.
 *
 * ── Memoization ──────────────────────────────────────────────────────────
 * Results are cached by `${history.length}:${mode}:${lotteryType}`.
 * Recomputation is skipped unless the raw history array length changes.
 *
 * ── Performance Compliance ───────────────────────────────────────────────
 * The effective backtest depth is capped at OPTIMIZER_MAX_DEPTH (default 10).
 * This bounds the total work to ≤ 286 × 10 predict calls, keeping execution
 * within the 500 ms / 100-draw and 2 s / 300-draw budgets for 2–4 digit modes.
 *
 * @param {Array}  history     - Full draw history array (newest first).
 * @param {string} mode        - Prize mode key (e.g. "back2", "tail4").
 * @param {string} lotteryType - "thai" | "lao".
 * @param {number} sampleDepth - Requested evaluation depth (will be capped internally).
 * @returns {{ weightPos, weightRec, weightMarkov, weightCooc,
 *             filterOddEven, filterHighLow, blockConsecutive }}
 *         Integer-percentage config ready for consumption by the prediction engine.
 */
export function findBestWeights(history, mode, lotteryType, sampleDepth) {
  // ── Cache lookup ────────────────────────────────────────────────────────
  const cacheKey = `${history.length}:${mode}:${lotteryType}`;
  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  // ── Start telemetry timer ───────────────────────────────────────────────
  // PORTABILITY: replace Date.now() with time.Now().UnixMilli() in Go.
  const t0 = Date.now();

  // ── Guard: insufficient history ─────────────────────────────────────────
  // Need at least MIN_TRAINING_DRAWS for a valid training slice + 1 test draw.
  const effectiveDepth = Math.min(
    Math.max(0, sampleDepth),
    OPTIMIZER_MAX_DEPTH,
    history.length - MIN_TRAINING_DRAWS
  );

  if (effectiveDepth <= 0) {
    _cache.set(cacheKey, V1_FALLBACK_CONFIG);
    // PORTABILITY: replace console.log with your structured logger.
    console.log('[LottoLens:telemetry]', {
      event:             'optimizer_execution',
      iterations:        0,
      optimizedWeights:  { pos: 0.25, rec: 0.25, mar: 0.30, cooc: 0.20 },
      executionTimeMs:   Date.now() - t0,
      note:              'Insufficient history — returned v1 fallback',
    });
    return V1_FALLBACK_CONFIG;
  }

  // ── Baseline: Engine v1 performance on this dataset ─────────────────────
  const baselineResult = runHistoricalBacktest(
    history, mode, lotteryType, V1_FALLBACK_CONFIG, effectiveDepth
  );
  const baselineTop20 = baselineResult.hitRateTop20;
  const baselineTop10 = baselineResult.hitRateTop10;

  // ── Grid Search ─────────────────────────────────────────────────────────
  const combinations = _generateWeightCombinations(); // 286 entries
  let iterations    = 0;
  let bestConfig    = null;
  let bestTop20     = -Infinity;
  let bestTop10     = -Infinity;

  for (const combo of combinations) {
    iterations++;
    const config = toEngineConfig(combo);
    const result = runHistoricalBacktest(history, mode, lotteryType, config, effectiveDepth);

    // ── Statistical Validation ─────────────────────────────────────────
    // Reject if Top20 regresses vs baseline.
    if (result.hitRateTop20 < baselineTop20) continue;
    // Reject if Top10 degrades by more than 5 percentage points.
    if (result.hitRateTop10 < baselineTop10 - 5) continue;

    // ── Selection: maximise Top20; tie-break by Top10 ──────────────────
    const isStrictlyBetter = result.hitRateTop20 > bestTop20;
    const isTiedAndBetter  = result.hitRateTop20 === bestTop20 &&
                             result.hitRateTop10 >  bestTop10;

    if (isStrictlyBetter || isTiedAndBetter) {
      bestConfig = config;
      bestTop20  = result.hitRateTop20;
      bestTop10  = result.hitRateTop10;
    }
  }

  // ── Fallback: no combination passed statistical validation ──────────────
  const finalConfig = bestConfig ?? V1_FALLBACK_CONFIG;
  const executionTimeMs = Date.now() - t0;

  // ── Telemetry ───────────────────────────────────────────────────────────
  // PORTABILITY: replace console.log with your structured logger.
  console.log('[LottoLens:telemetry]', {
    event:            'optimizer_execution',
    iterations,
    optimizedWeights: {
      pos:  finalConfig.weightPos    / 100,
      rec:  finalConfig.weightRec    / 100,
      mar:  finalConfig.weightMarkov / 100,
      cooc: finalConfig.weightCooc   / 100,
    },
    executionTimeMs,
  });

  // ── Store in cache ──────────────────────────────────────────────────────
  _cache.set(cacheKey, finalConfig);
  return finalConfig;
}

/**
 * Evict all cached optimisation results.
 * Call when you need to force re-optimisation, e.g., after a significant
 * history update that doesn't change array length (rare in production).
 */
export function clearOptimizerCache() {
  _cache.clear();
}

/**
 * Return the number of entries currently held in the optimisation cache.
 * Primarily used for diagnostics and unit testing.
 * @returns {number}
 */
export function getOptimizerCacheSize() {
  return _cache.size;
}
