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

/**
 * Core Prediction Algorithm
 * @param {Array} history
 * @param {string} mode
 * @param {string} lotteryType
 * @param {Object} config
 * @returns {Object}
 */
export function calculateUnifiedAIPredict(history, mode, lotteryType, config) {
  const {
    weightPos,
    weightRec,
    weightMarkov,
    weightCooc,
    filterOddEven,
    filterHighLow,
    blockConsecutive,
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
    // 1. Normalized Positional Score
    let scorePos = 0;
    for (let p = 0; p < len; p++) {
      scorePos += posFreqs[p][Number(candidate[p])] || 0;
    }
    const scorePosNorm = scorePos / (len * seq.length || 1);

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

  return {
    confidence,
    core,
    primary,
    backup,
    logic,
    methods: methods.length > 0 ? methods : ["Dynamic Voting"],
  };
}

/**
 * Historical Backtesting Simulator
 * @param {Array} history
 * @param {string} mode
 * @param {string} lotteryType
 * @param {Object} config
 * @param {number} depth
 * @returns {Object}
 */
export function runHistoricalBacktest(history, mode, lotteryType, config, depth) {
  const minTrainingDraws = 15;
  const actualDepth = Math.min(depth, history.length - minTrainingDraws);

  if (actualDepth <= 0) {
    return {
      hitRate: 0,
      total: 0,
      hits: 0,
      details: [],
    };
  }

  let hits = 0;
  const details = [];

  // Simulate starting from oldest draws to newest
  for (let k = actualDepth - 1; k >= 0; k--) {
    const testDraw = history[k];
    const trainingHistory = history.slice(k + 1);

    // Predict using only the training slice
    const predResult = calculateUnifiedAIPredict(trainingHistory, mode, lotteryType, config);
    const actualNum = getActualNumberForDraw(testDraw, mode, lotteryType);

    // Hit is defined as matching the primary predictions list
    const isHit = predResult.primary.includes(actualNum);
    if (isHit) hits++;

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

  const hitRate = Math.round((hits / actualDepth) * 100);

  return {
    hitRate,
    total: actualDepth,
    hits,
    details,
  };
}
