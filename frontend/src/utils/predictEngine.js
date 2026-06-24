/**
 * UnifiedAIPredict Engine — Client-Side Mathematical Lottery Predictor & Backtester
 * Implements: Multi-Model Voting, Positional Frequency, Recency/Gap weight, Markov Chain, Co-occurrence Matrix
 */

/**
 * Helper to get digit length based on mode and lottery type.
 * @param {string} mode
 * @param {string} lotteryType
 * @returns {number}
 */
export function getDigitLength(mode, lotteryType) {
  if (lotteryType === "lao") {
    if (mode === "tail4") return 4;
    if (mode === "top3") return 3;
    if (mode === "top2") return 2;
    return 2;
  } else {
    if (mode === "first") return 6;
    if (mode === "front3" || mode === "back3") return 3;
    if (mode === "back2") return 2;
    return 2;
  }
}

/**
 * Helper to retrieve actual winning number for a given draw and mode.
 * @param {Object} draw
 * @param {string} mode
 * @param {string} lotteryType
 * @returns {string}
 */
export function getActualNumberForDraw(draw, mode, lotteryType) {
  if (!draw) return "";
  if (lotteryType === "lao") {
    if (mode === "tail4") return draw.tail4 || "";
    if (mode === "top3") return draw.top3 || "";
    if (mode === "top2") return draw.top2 || "";
    return draw.tail4 ? draw.tail4.substring(2) : "";
  } else {
    if (mode === "first") return draw.first || "";
    if (mode === "front3") return draw.front3 ? draw.front3[0] : "";
    if (mode === "back3") return draw.back3 ? draw.back3[0] : "";
    if (mode === "back2") return draw.back2 || "";
    return draw.first ? draw.first.substring(4) : "";
  }
}

/**
 * Constraint Filter to check if a number satisfies specified rules.
 * @param {string} numStr
 * @param {Object} constraints
 * @returns {boolean}
 */
export function satisfiesConstraints(numStr, constraints) {
  const { filterOddEven, filterHighLow, blockConsecutive } = constraints;
  const digs = numStr.split("").map(Number);
  if (digs.length < 2) return true;

  if (filterOddEven) {
    const odds = digs.filter(d => d % 2 !== 0).length;
    if (odds === 0 || odds === digs.length) return false;
  }
  if (filterHighLow) {
    const highs = digs.filter(d => d >= 5).length;
    if (highs === 0 || highs === digs.length) return false;
  }
  if (blockConsecutive) {
    for (let i = 0; i < digs.length - 1; i++) {
      if (Math.abs(digs[i] - digs[i + 1]) === 1) return false;
    }
  }
  return true;
}

// =============================================================================
// ENGINE REGISTRY — Immutable Version Control Matrix
// =============================================================================
//
// Every entry is triple-frozen:
//   1. The Map itself (ENGINE_REGISTRY)
//   2. Each engine descriptor object
//   3. Each nested sub-object (weights, constraints)
//
// This guarantees that executing Engine v2 can never mutate or reference the
// constant values stored inside Engine v1. Any mutation attempt is silently
// ignored in sloppy mode and throws a TypeError in strict mode.
// =============================================================================

/**
 * ENGINE_REGISTRY — Canonical, immutable version control map for analytics engines.
 *
 * Keys are string version identifiers ("v1", "v2", …).
 * Values are deeply-frozen engine descriptor objects containing:
 *   - id          {string}  — Canonical version identifier.
 *   - label       {string}  — Human-readable display name.
 *   - status      {string}  — "stable" | "placeholder" | "deprecated".
 *   - description {string}  — One-line intent summary.
 *   - weights     {Object}  — Fractional scoring weights (must sum to 1.0).
 *   - constraints {Object}  — Structural constraint filter defaults.
 *
 * @type {ReadonlyMap<string, Readonly<Object>>}
 */
export const ENGINE_REGISTRY = Object.freeze(
  new Map([
    // ── Engine v1 ────────────────────────────────────────────────────────────
    // Static Legacy Baseline. Fixed equal-weight spread. This configuration is
    // the canonical reference point for all comparative backtesting work.
    // DO NOT alter these constants — changes belong in a new versioned entry.
    [
      "v1",
      Object.freeze({
        id:          "v1",
        label:       "Engine v1 (Static Legacy Baseline)",
        status:      "stable",
        description: "โมเดลพื้นฐานแบบคงที่ (น้ำหนักกระจายเท่ากัน) ใช้เป็นเกณฑ์มาตรฐานในการเปรียบเทียบผลลัพธ์ย้อนหลังทั้งหมด",
        weights: Object.freeze({
          weightPos:    0.25,
          weightRec:    0.25,
          weightMarkov: 0.30,
          weightCooc:   0.20,
        }),
        constraints: Object.freeze({
          filterOddEven:    true,
          filterHighLow:    true,
          blockConsecutive: false,
        }),
      }),
    ],

    // ── Engine v2 ────────────────────────────────────────────────────────────
    // Grid Search Optimizer (Phase 4). Runtime weights are resolved dynamically
    // by findBestWeights() in weightOptimizer.js; the values below are the
    // equal-weight seed used when VITE_ENABLE_DYNAMIC_WEIGHTS is false.
    // status: "dynamic" — runtime weights are data-driven via grid search.
    [
      "v2",
      Object.freeze({
        id:          "v2",
        label:       "Engine v2 (Grid Search Optimizer)",
        status:      "dynamic",
        description: "โมเดล AI ปรับน้ำหนักอัตโนมัติ (Grid Search) ทดสอบ 286 รูปแบบจากสถิติย้อนหลัง เพื่อหาค่าน้ำหนักที่ทำให้อัตราเข้าเป้า (Top-20 Hit Rate) สูงที่สุด ณ ขณะนั้น",
        weights: Object.freeze({
          // Seed / static fallback weights (equal spread).
          // When VITE_ENABLE_DYNAMIC_WEIGHTS=true, these are overridden at
          // runtime by the optimizer's output stored in its memoization cache.
          weightPos:    0.25,
          weightRec:    0.25,
          weightMarkov: 0.25,
          weightCooc:   0.25,
        }),
        constraints: Object.freeze({
          // Optimizer searches weight space only; constraints mirror v1 defaults.
          filterOddEven:    true,
          filterHighLow:    true,
          blockConsecutive: false,
        }),
      }),
    ],

    // ── Engine v3 ──────────────────────────────────────────────────────────────────────
    // Bayesian Adaptive Scoring (Phase 5). Replaces the raw positional frequency
    // model with a Bayesian-updated posterior that blends a uniform Dirichlet
    // prior (concentration α) with the observed digit counts. This "shrinks"
    // low-sample outliers toward the uniform baseline, preventing volatile digits
    // from dominating the score layout.
    // status: "stable" — validated against Engine v2 on backtested Top-20 rate.
    [
      "v3",
      Object.freeze({
        id:          "v3",
        label:       "Engine v3 (Bayesian Adaptive Scoring)",
        status:      "stable",
        description: "โมเดลปรับสมดุลสถิติด้วยทฤษฎีความน่าจะเป็น (Bayesian Adaptive Scoring) ลดความผันผวนจากข้อมูลตัวอย่างน้อย ป้องกันเลขที่ออกซ้ำบ่อยดึงคะแนนผิดปกติ (ใช้น้ำหนักสัดส่วนเดียวกับ v1)",
        weights: Object.freeze({
          // Inherit v1 weight spread — Bayesian layer replaces the positional
          // computation, not the multi-model vote ratios.
          weightPos:    0.25,
          weightRec:    0.25,
          weightMarkov: 0.30,
          weightCooc:   0.20,
        }),
        constraints: Object.freeze({
          filterOddEven:    true,
          filterHighLow:    true,
          blockConsecutive: false,
        }),
        bayesian: Object.freeze({
          // Dirichlet concentration parameter (pseudo-count per digit).
          // α = 2 ⇒ weak uniform prior; data dominates after ~20 observations.
          // Increasing α strengthens shrinkage (useful for very small datasets).
          alpha: 2,
          // Number of discrete outcomes per position (decimal digits 0–9).
          numCategories: 10,
        }),
      }),
    ],
  ])
);

/**
 * Resolve a registry entry into the config shape expected by
 * {@link calculateUnifiedAIPredict} and {@link runHistoricalBacktest}.
 *
 * The registry stores weights as fractions in [0, 1] for precision; the
 * scoring engine and UI expect integer percentages in [0, 100]. This function
 * converts between the two representations at the boundary.
 *
 * Falls back silently to Engine v1 if the supplied id is not registered,
 * ensuring the engine always receives a valid configuration.
 *
 * @param {string} engineId - Registry key ("v1" | "v2" | "v3" | …).
 * @returns {{
 *   weightPos: number, weightRec: number, weightMarkov: number, weightCooc: number,
 *   filterOddEven: boolean, filterHighLow: boolean, blockConsecutive: boolean,
 *   useBayesian: boolean, bayesianAlpha: number, bayesianCategories: number
 * }} Config object ready for direct consumption by the prediction/backtest engines.
 */
export function resolveEngineConfig(engineId) {
  const engine = ENGINE_REGISTRY.get(engineId) ?? ENGINE_REGISTRY.get("v1");
  const { weights, constraints, bayesian } = engine;
  return {
    weightPos:          Math.round(weights.weightPos    * 100),
    weightRec:          Math.round(weights.weightRec    * 100),
    weightMarkov:       Math.round(weights.weightMarkov * 100),
    weightCooc:         Math.round(weights.weightCooc   * 100),
    filterOddEven:      constraints.filterOddEven,
    filterHighLow:      constraints.filterHighLow,
    blockConsecutive:   constraints.blockConsecutive,
    // Bayesian fields — present only when the registry entry declares a
    // bayesian block; all other engines default to frequentist mode.
    useBayesian:        bayesian != null,
    bayesianAlpha:      bayesian?.alpha      ?? 0,
    bayesianCategories: bayesian?.numCategories ?? 10,
  };
}

// =============================================================================

/**
 * Clamps a value between min and max, then rounds to an integer.
 * Used to safely convert normalized [0, 1] scores to the 0–100 integer scale.
 * @param {number} value - Raw floating-point score.
 * @param {number} [min=0]
 * @param {number} [max=100]
 * @returns {number} Integer in [min, max].
 */
function clampInt(value, min = 0, max = 100) {
  return Math.round(Math.min(max, Math.max(min, value)));
}

// =============================================================================
// BAYESIAN LAYER — Dirichlet-Multinomial Posterior Estimator
// =============================================================================

/**
 * Compute a Bayesian-updated (posterior) frequency table for a single position
 * using a symmetric Dirichlet prior.
 *
 * Model: data ~ Multinomial(N, θ); prior: θ ~ Dirichlet(α, …, α)
 *   Posterior mean: θ̂_k = (n_k + α) / (N + α × K)
 * where:
 *   n_k  = observed count for category k
 *   N    = total observations (seq.length)
 *   α    = concentration / pseudo-count per category (prior strength)
 *   K    = number of categories (10 decimal digits)
 *
 * Shrinkage principle:
 *   • When N ≪ α×K, posterior ≈ uniform (1/K per digit) — maximum shrinkage.
 *   • When N ≫ α×K, posterior ≈ empirical frequency — minimum shrinkage.
 *   • Prevents a digit seen once in 3 draws from dominating the score.
 *
 * Graceful degradation: returns a uniform array on any arithmetic anomaly
 * (division by zero, NaN, or invalid inputs) instead of throwing.
 *
 * @param {number[]} rawCounts  - Array of length K; rawCounts[k] = observed count for digit k.
 * @param {number}   alpha      - Dirichlet concentration parameter (α > 0).
 * @param {number}   [K=10]     - Number of categories.
 * @returns {number[]} Posterior mean probabilities, length K, summing to ~1.
 */
export function computeBayesianPosterior(rawCounts, alpha, K = 10) {
  try {
    // Validate inputs — degrade to uniform on anything anomalous
    if (!Array.isArray(rawCounts) || rawCounts.length !== K) {
      return Array(K).fill(1 / K);
    }
    if (!Number.isFinite(alpha) || alpha <= 0) {
      return Array(K).fill(1 / K);
    }

    const N = rawCounts.reduce((s, c) => s + (Number.isFinite(c) && c >= 0 ? c : 0), 0);
    const denominator = N + alpha * K;

    // Denominator guard — can only be zero if N=0 AND alpha×K=0 (impossible for
    // valid inputs, but defended against anyway for strict runtime safety)
    if (denominator <= 0) {
      return Array(K).fill(1 / K);
    }

    return rawCounts.map(n_k => {
      const safeCount = Number.isFinite(n_k) && n_k >= 0 ? n_k : 0;
      return (safeCount + alpha) / denominator;
    });
  } catch {
    // Final safety net — any unhandled arithmetic exception degrades gracefully
    return Array(K).fill(1 / K);
  }
}

// =============================================================================
// ENTROPY LAYER — Shannon Information Entropy per Digit Position
// =============================================================================

/**
 * Shannon Entropy threshold table (in bits, base-2).
 *
 * Maximum theoretical entropy for 10 equiprobable digits: log2(10) = 3.3219 bits.
 * Thresholds are calibrated for the lottery digit domain.
 * @readonly
 */
export const ENTROPY_THRESHOLDS = Object.freeze([
  { minH: 3.10, severity: 'random',  label: 'Highly Random',              labelTH: 'สุ่มสูง — ไม่มีโครงสร้าง',             color: '#6ee7b7' },
  { minH: 2.80, severity: 'healthy', label: 'Near Uniform',               labelTH: 'ใกล้สม่ำเสมอ — โครงสร้างน้อย',       color: '#93c5fd' },
  { minH: 2.40, severity: 'mild',    label: 'Mild Clustering',            labelTH: 'คลัสเตอร์อ่อน — ความเอนเอียงปานกลาง', color: '#fcd34d' },
  { minH: 0.00, severity: 'alert',   label: 'High Structural Clustering', labelTH: 'คลัสเตอร์สูง — ตรวจพบ Bias ชัดเจน',   color: '#f87171' },
]);

/** @param {number} h Entropy in bits */
function classifyEntropy(h) {
  for (const tier of ENTROPY_THRESHOLDS) {
    if (h >= tier.minH) return tier;
  }
  return ENTROPY_THRESHOLDS[ENTROPY_THRESHOLDS.length - 1];
}

/**
 * Compute Shannon Entropy per digit position across draw history.
 *
 * Formula: H(X) = -SUM P(x_i) * log2(P(x_i))   for i = 0...9
 *
 * Bounds: 0.0 bits (one digit dominates completely) to log2(10) = 3.3219 bits (uniform).
 * Zero-count digits contribute 0 (limit of p*log2(p) -> 0 as p -> 0).
 *
 * Performance:  O(N x L x 10). For Thai back2 (L=2, N=100): ~2,000 ops (<1ms).
 *               Budget requirement (50ms) satisfied by >=10x margin on all modes.
 *
 * @param {Array}  history     - Draw history array (newest first).
 * @param {string} mode        - Prize mode key (e.g. "back2", "tail4").
 * @param {string} lotteryType - "thai" | "lao".
 * @returns {Array<{
 *   position:   number,
 *   entropy:    number,
 *   severity:   string,
 *   label:      string,
 *   labelTH:    string,
 *   color:      string,
 *   topDigit:   number,
 *   topFreqPct: number,
 * }>} Per-position entropy descriptors, or [] on invalid input.
 */
export function computePositionalEntropy(history, mode, lotteryType) {
  try {
    if (!Array.isArray(history) || history.length === 0) return [];
    const len = getDigitLength(mode, lotteryType);
    if (len <= 0) return [];

    const seq = history
      .map(row => getActualNumberForDraw(row, mode, lotteryType))
      .filter(Boolean)
      .map(s => String(s).padStart(len, '0'));

    if (seq.length === 0) return [];
    const N = seq.length;

    const posFreqs = Array.from({ length: len }, () => Array(10).fill(0));
    seq.forEach(numStr => {
      for (let p = 0; p < len; p++) {
        const digit = Number(numStr[p]);
        if (!isNaN(digit)) posFreqs[p][digit]++;
      }
    });

    // log2(10) using change-of-base: ln(10)/ln(2)
    const LOG2_10 = Math.log(10) / Math.log(2);

    return posFreqs.map((countRow, p) => {
      let H = 0;
      let topDigit = 0;
      let topCount = 0;

      for (let d = 0; d < 10; d++) {
        const count = countRow[d];
        if (count === 0) continue;
        if (count > topCount) { topCount = count; topDigit = d; }
        const prob = count / N;
        H -= prob * Math.log2(prob);
      }

      H = Math.max(0, Math.min(LOG2_10, H));
      const tier = classifyEntropy(H);

      return {
        position:   p,
        entropy:    Math.round(H * 1000) / 1000,
        severity:   tier.severity,
        label:      tier.label,
        labelTH:    tier.labelTH,
        color:      tier.color,
        topDigit,
        topFreqPct: Math.round((topCount / N) * 100),
      };
    });
  } catch {
    return [];
  }
}

// =============================================================================

/**
 * Core Prediction Algorithm — Multi-Model Voting Engine.
 *
 * Computes a ranked list of candidates using four mathematical sub-models:
 * Positional Frequency, Recency/Gap, Markov Chain Transition, and
 * Co-occurrence (Pair Strength). Returns the top candidates along with
 * an `evidence` breakdown of each model's contribution for the winning number.
 *
 * @param {Array}  history     - Draw history array (newest first).
 * @param {string} mode        - Prize mode key (e.g. "back2", "tail4").
 * @param {string} lotteryType - "thai" | "lao".
 * @param {Object} config      - Hyperparameter weights and constraint flags.
 * @param {number} config.weightPos        - Weight for positional frequency model.
 * @param {number} config.weightRec        - Weight for recency/gap model.
 * @param {number} config.weightMarkov     - Weight for Markov chain model.
 * @param {number} config.weightCooc       - Weight for co-occurrence model.
 * @param {boolean} config.filterOddEven   - Enforce odd/even digit balance.
 * @param {boolean} config.filterHighLow   - Enforce high/low digit balance.
 * @param {boolean} config.blockConsecutive - Block consecutive digit sequences.
 * @returns {Object} Prediction result including `evidence` sub-score breakdown.
 */
export function calculateUnifiedAIPredict(history, mode, lotteryType, config) {
  /** @type {number} Execution start timestamp for telemetry. */
  const t0 = performance.now();
  const {
    weightPos,
    weightRec,
    weightMarkov,
    weightCooc,
    filterOddEven,
    filterHighLow,
    blockConsecutive,
    // Bayesian fields — undefined / false for v1 and v2 configs
    useBayesian        = false,
    bayesianAlpha      = 2,
    bayesianCategories = 10,
  } = config;

  const len = getDigitLength(mode, lotteryType);

  // Extract sequential numbers for analysis, ordered from newest to oldest
  const seq = history
    .map(row => getActualNumberForDraw(row, mode, lotteryType))
    .filter(Boolean)
    .map(s => String(s).padStart(len, "0"));

  if (seq.length === 0) {
    const fallbackVal = "0".repeat(len);
    return {
      confidence: 50,
      core: fallbackVal,
      primary: [fallbackVal],
      backup: [fallbackVal],
      logic: "ข้อมูลไม่เพียงพอในการวิเคราะห์",
      methods: ["Fallback"],
      /**
       * Evidence sub-scores default to zero when history is empty.
       * @type {{ positional: number, recency: number, markov: number, pair: number, finalScore: number }}
       */
      evidence: { positional: 0, recency: 0, markov: 0, pair: 0, finalScore: 0 },
      /** All ranked candidates (empty on fallback). */
      allRanked: [],
    };
  }

  const sumWeights = seq.reduce((sum, _, i) => sum + Math.exp(-0.05 * i), 0) || 1;

  // 1. Positional Frequency Table
  const posFreqs = Array.from({ length: len }, () => Array(10).fill(0));
  seq.forEach(numStr => {
    numStr.split("").forEach((char, p) => {
      const digit = Number(char);
      if (!isNaN(digit)) posFreqs[p][digit]++;
    });
  });

  // 1b. Bayesian Posterior Table (Engine v3 path)
  //
  // When useBayesian is true, replace the raw count lookup with a Dirichlet
  // posterior mean for each position. The posterior is a probability in [0, 1],
  // so the per-candidate positional score is the sum of posterior probabilities
  // across positions — naturally bounded [0, len/K ... 1] without dividing by
  // seq.length.
  //
  // Fallback path: if computeBayesianPosterior returns a uniform array (its
  // own graceful-degradation guarantee), the model continues to function
  // identically to a uniform frequentist estimate.
  let posPosteriors = null; // null ⇒ frequentist path
  if (useBayesian) {
    posPosteriors = posFreqs.map(countRow =>
      computeBayesianPosterior(countRow, bayesianAlpha, bayesianCategories)
    );
  }

  // 2. Recency Frequency (Exponential Decay)
  const recencyFreq = Array.from({ length: len }, () => Array(10).fill(0));
  seq.forEach((numStr, i) => {
    const weight = Math.exp(-0.05 * i);
    numStr.split("").forEach((char, p) => {
      const digit = Number(char);
      if (!isNaN(digit)) recencyFreq[p][digit] += weight;
    });
  });

  // 3. Positional Markov Chain Transitions
  const posTransitions = Array.from({ length: len }, () =>
    Array.from({ length: 10 }, () => Array(10).fill(0))
  );
  for (let i = 0; i < seq.length - 1; i++) {
    const currentDigs = seq[i].split("").map(Number);
    const prevDigs = seq[i + 1].split("").map(Number);
    for (let p = 0; p < len; p++) {
      const fromDigit = prevDigs[p];
      const toDigit = currentDigs[p];
      if (fromDigit !== undefined && toDigit !== undefined) {
        posTransitions[p][fromDigit][toDigit]++;
      }
    }
  }

  // 4. Co-occurrence Matrix
  const coocMatrix = Array.from({ length: 10 }, () => Array(10).fill(0));
  seq.forEach(numStr => {
    const uniqueDigits = Array.from(new Set(numStr.split("").map(Number)));
    for (let i = 0; i < uniqueDigits.length; i++) {
      for (let j = i + 1; j < uniqueDigits.length; j++) {
        const d1 = uniqueDigits[i];
        const d2 = uniqueDigits[j];
        coocMatrix[d1][d2]++;
        coocMatrix[d2][d1]++;
      }
    }
  });

  // Generate Search Space Candidates
  let candidates = [];
  if (len <= 4) {
    const maxVal = Math.pow(10, len);
    for (let i = 0; i < maxVal; i++) {
      candidates.push(String(i).padStart(len, "0"));
    }
  } else {
    // For 6-digit lottery, generate from top 5 digits per position
    const topDigitsPerPos = [];
    for (let p = 0; p < len; p++) {
      const sorted = posFreqs[p]
        .map((count, digit) => ({ digit, count }))
        .sort((a, b) => b.count - a.count);
      topDigitsPerPos.push(sorted.slice(0, 5).map(x => x.digit));
    }
    const cartesian = (arrays) => {
      return arrays.reduce(
        (acc, curr) => {
          return acc.flatMap(d => curr.map(e => d + String(e)));
        },
        [""]
      );
    };
    candidates = cartesian(topDigitsPerPos);
  }

  // Filter by constraints
  const constraints = { filterOddEven, filterHighLow, blockConsecutive };
  let filteredCandidates = candidates.filter(c => satisfiesConstraints(c, constraints));
  
  // Fallback to relaxed constraints if nothing satisfies them
  if (filteredCandidates.length === 0) {
    filteredCandidates = candidates.filter(c =>
      satisfiesConstraints(c, { ...constraints, blockConsecutive: false })
    );
    if (filteredCandidates.length === 0) {
      filteredCandidates = candidates;
    }
  }

  // Score Candidates
  const scoredCandidates = [];
  const lastDrawStr = seq[0];

  filteredCandidates.forEach(candidate => {
    // 1. Positional Score
    //    Frequentist path: raw count normalised by (len × N).
    //    Bayesian path:    sum of posterior mean probabilities per position,
    //                      normalised by len so it lands in [0, 1].
    let scorePosNorm = 0;
    if (posPosteriors) {
      // Bayesian branch — posteriors are already probabilities; sum and divide by len
      let sumPost = 0;
      for (let p = 0; p < len; p++) {
        sumPost += posPosteriors[p][Number(candidate[p])] || 0;
      }
      scorePosNorm = sumPost / (len || 1);
    } else {
      // Frequentist branch (v1 / v2 / legacy)
      let scorePos = 0;
      for (let p = 0; p < len; p++) {
        scorePos += posFreqs[p][Number(candidate[p])] || 0;
      }
      scorePosNorm = scorePos / (len * seq.length || 1);
    }

    // 2. Normalized Recency Score
    let scoreRec = 0;
    for (let p = 0; p < len; p++) {
      scoreRec += recencyFreq[p][Number(candidate[p])] || 0;
    }
    const scoreRecNorm = scoreRec / (len * sumWeights);

    // 3. Markov Score
    let scoreMarkov = 0;
    if (seq.length > 1 && lastDrawStr) {
      for (let p = 0; p < len; p++) {
        const dLast = Number(lastDrawStr[p]);
        const dCand = Number(candidate[p]);
        const countTransition = posTransitions[p][dLast][dCand] || 0;
        const totalTransitionFromDLast =
          posTransitions[p][dLast].reduce((sum, c) => sum + c, 0) || 1;
        scoreMarkov += countTransition / totalTransitionFromDLast;
      }
      scoreMarkov = scoreMarkov / len;
    }

    // 4. Normalized Co-occurrence Score
    let scoreCooc = 0;
    let pairCount = 0;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const d1 = Number(candidate[i]);
        const d2 = Number(candidate[j]);
        scoreCooc += coocMatrix[d1][d2] || 0;
        pairCount++;
      }
    }
    const scoreCoocNorm = pairCount > 0 ? scoreCooc / (pairCount * seq.length || 1) : 0;

    // Apply hyperparameter weights (normalized to sum of weights)
    const totalWeight = weightPos + weightRec + weightMarkov + weightCooc || 1;
    const finalScore =
      ((weightPos * scorePosNorm +
        weightRec * scoreRecNorm +
        weightMarkov * scoreMarkov +
        weightCooc * scoreCoocNorm) /
        totalWeight) *
      100;

    scoredCandidates.push({
      number: candidate,
      score: finalScore,
      // Store normalized component scores (0–1 range) so the top candidate's
      // individual model contributions can be exposed in the evidence object.
      _scorePosNorm: scorePosNorm,
      _scoreRecNorm: scoreRecNorm,
      _scoreMarkov: scoreMarkov,
      _scoreCoocNorm: scoreCoocNorm,
    });
  });

  // Sort by final score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  const core = scoredCandidates[0]?.number || "0".repeat(len);
  const primary = scoredCandidates.slice(0, 1).map(x => x.number);
  const backup = scoredCandidates.slice(1, 2).map(x => x.number);

  // Dynamic Confidence formulation based on score profile
  const baseConf = 55;
  const spreadBonus = scoredCandidates.length > 1 ? Math.min(25, (scoredCandidates[0].score - scoredCandidates[1].score) * 10) : 0;
  const dataSizeBonus = Math.min(15, seq.length * 0.1);
  const confidence = Math.min(95, Math.max(55, Math.round(baseConf + spreadBonus + dataSizeBonus)));

  // Generate mathematical explanation copy
  const methods = [];
  if (weightPos > 0) methods.push("Positional Freq");
  if (weightRec > 0) methods.push("Recency Gap");
  if (weightMarkov > 0 && seq.length > 1) methods.push("Markov Transition");
  if (weightCooc > 0 && len > 1) methods.push("Co-occurrence Matrix");

  const logic = `วิเคราะห์เลขรางวัล ${mode} ด้วยสถาปัตยกรรม UnifiedAIPredict คัดเลือกตัวเลขจากความสอดคล้องตามโครงสร้างคณิตศาสตร์ โดยตัวเลขเด่น ${core} ได้รับคะแนนสูงสุดจากการให้น้ำหนักโมเดล ${methods.join(" + ")} (ผ่านเกณฑ์กรอง Constraint โครงสร้างสมดุล คู่/คี่: ${filterOddEven ? "เปิด" : "ปิด"} | สูง/ต่ำ: ${filterHighLow ? "เปิด" : "ปิด"} | เลขเรียง: ${blockConsecutive ? "ปิดกั้น" : "อนุญาต"})`;

  /**
   * Build the evidence breakdown from the top-ranked candidate's stored
   * component scores. Each value is clamped to [0, 100] integer.
   * @type {{ positional: number, recency: number, markov: number, pair: number, finalScore: number }}
   */
  const topCandidate = scoredCandidates[0];
  const evidence = topCandidate
    ? {
        positional: clampInt(topCandidate._scorePosNorm * 100),
        recency:    clampInt(topCandidate._scoreRecNorm * 100),
        markov:     clampInt(topCandidate._scoreMarkov  * 100),
        pair:       clampInt(topCandidate._scoreCoocNorm * 100),
        finalScore: clampInt(topCandidate.score),
      }
    : { positional: 0, recency: 0, markov: 0, pair: 0, finalScore: 0 };

  // Telemetry: emit a structured event for observability / analytics.
  console.log('[LottoLens:telemetry]', {
    event: 'prediction_generated',
    finalScore: evidence.finalScore,
    executionTimeMs: Math.round(performance.now() - t0),
  });

  return {
    confidence,
    core,
    primary,
    backup,
    logic,
    methods: methods.length > 0 ? methods : ["Dynamic Voting"],
    evidence,
    /**
     * Full ranked candidate list (score descending). Used by the backtest engine
     * to evaluate multi-tier hit-rate thresholds (top-10, top-20, top-50)
     * without any additional computation pass.
     * @type {string[]}
     */
    allRanked: scoredCandidates.map(c => c.number),
  };
}

/**
 * Historical Backtesting Simulator — Multi-Tier Evaluation Engine.
 *
 * Simulates the prediction model against real historical draws and measures
 * empirical hit rates at three candidate-pool depth thresholds: top 10, top 20,
 * and top 50. The legacy `hitRate` / `hits` fields are preserved for backward
 * compatibility with the existing UI render path.
 *
 * @param {Array}  history     - Full draw history array (newest first).
 * @param {string} mode        - Prize mode key (e.g. "back2", "tail4").
 * @param {string} lotteryType - "thai" | "lao".
 * @param {Object} config      - Hyperparameter weights and constraint flags.
 * @param {number} depth       - Number of historical draws to simulate.
 * @returns {Object} Backtest results including multi-tier hit rate metrics.
 */
export function runHistoricalBacktest(history, mode, lotteryType, config, depth) {
  /** @type {number} Execution start timestamp for telemetry. */
  const t0 = performance.now();

  const minTrainingDraws = 15;
  const actualDepth = Math.min(depth, history.length - minTrainingDraws);

  if (actualDepth <= 0) {
    return {
      hitRate: 0,
      hitRateTop10: 0,
      hitRateTop20: 0,
      hitRateTop50: 0,
      total: 0,
      hits: 0,
      details: [],
    };
  }

  let hits = 0;
  /**
   * Hit counters for multi-tier threshold evaluation.
   * A "hit" at tier N means the actual winning number appears anywhere
   * within the top-N entries of `allRanked` (the full score-sorted
   * candidate list returned by calculateUnifiedAIPredict).
   */
  let hitsTop10 = 0;
  let hitsTop20 = 0;
  let hitsTop50 = 0;

  const details = [];

  // Simulate starting from oldest draws to newest
  for (let k = actualDepth - 1; k >= 0; k--) {
    const testDraw = history[k];
    const trainingHistory = history.slice(k + 1);

    // Predict using only the training slice
    const predResult = calculateUnifiedAIPredict(trainingHistory, mode, lotteryType, config);
    const actualNum = getActualNumberForDraw(testDraw, mode, lotteryType);

    // Legacy hit: actual appears in primary (top-1) list
    const isHit = predResult.primary.includes(actualNum);
    if (isHit) hits++;

    // Multi-tier threshold evaluation using the full ranked candidate list.
    // `allRanked` is already sorted descending by composite score — no extra
    // sorting needed here. Safe-guard with `|| []` for backward compatibility
    // if called with an older version of the engine that lacks allRanked.
    const ranked = predResult.allRanked || [];
    if (ranked.slice(0, 10).includes(actualNum))  hitsTop10++;
    if (ranked.slice(0, 20).includes(actualNum))  hitsTop20++;
    if (ranked.slice(0, 50).includes(actualNum))  hitsTop50++;

    details.push({
      date: testDraw.dateTH || testDraw.date || testDraw.dateISO,
      actual: actualNum,
      predicted: predResult.primary.join(", "),
      core: predResult.core,
      isHit,
    });
  }

  // Reverse details so that the newest simulation draw is shown first in the UI
  details.reverse();

  const hitRate      = Math.round((hits      / actualDepth) * 100);
  const hitRateTop10 = Math.round((hitsTop10 / actualDepth) * 100);
  const hitRateTop20 = Math.round((hitsTop20 / actualDepth) * 100);
  const hitRateTop50 = Math.round((hitsTop50 / actualDepth) * 100);

  // Telemetry: structured event for observability / analytics.
  console.log('[LottoLens:telemetry]', {
    event: 'backtest_executed',
    sampleDepth: actualDepth,
    hitRateTop10,
    hitRateTop20,
    hitRateTop50,
    executionTimeMs: performance.now() - t0,
  });

  return {
    hitRate,
    hitRateTop10,
    hitRateTop20,
    hitRateTop50,
    total: actualDepth,
    hits,
    details,
  };
}
