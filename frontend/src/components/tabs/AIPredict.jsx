import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { callGemini } from "../../services/gemini";
import { fetchAIContext } from "../../services/api";
import { getNextDraw, getNextLaoDraw } from "../../utils/helpers";
import { useLottery } from "../../context/LotteryContext";
import Skeleton from "../ui/Skeleton";
import { 
  Bot, Shield, Target, TrendingUp, AlertTriangle, MessageSquare, Search, 
  Sparkles, Check, Award, BarChart3, Sliders, Play, Cpu
} from "lucide-react";
import { 
  calculateUnifiedAIPredict, 
  runHistoricalBacktest, 
  getDigitLength,
  getActualNumberForDraw,
  ENGINE_REGISTRY,
  resolveEngineConfig,
} from "../../utils/predictEngine";
import { findBestWeights } from "../../utils/weightOptimizer";
import PerformanceTrackingPanel from "../ai/PerformanceTrackingPanel";
import EvidencePanel from "../ai/EvidencePanel";
import EntropyPanel from "../ai/EntropyPanel";
import { renderMarkdown } from "../ai/markdownRenderer";

/**
 * Feature flag: Engine Registry version selector.
 * When false (default), the UI is hidden and Engine v1 weights are used statically,
 * preserving exact backward compatibility with pre-registry behaviour.
 * To activate: set VITE_ENABLE_ENGINE_REGISTRY=true in .env and restart the dev server.
 */
const ENGINE_REGISTRY_ENABLED = import.meta.env.VITE_ENABLE_ENGINE_REGISTRY === "true";

/**
 * Feature flag: Grid Search dynamic weight optimizer for Engine v2.
 * When false (default), Engine v2 uses its static seed weights from the registry.
 * When true, getActiveConfig() for v2 triggers findBestWeights() and returns the
 * optimizer's best-found weight configuration, backed by its memoization cache.
 * To activate: set VITE_ENABLE_DYNAMIC_WEIGHTS=true in .env and restart the dev server.
 */
const DYNAMIC_WEIGHTS_ENABLED = import.meta.env.VITE_ENABLE_DYNAMIC_WEIGHTS === "true";

/**
 * Tab: AIPredict — Lottery analysis using mathematical architecture and AI
 * @param {{ history: Array, stats: Object }} props
 */
export default function AIPredict({ history, stats }) {
  const { lotteryType } = useLottery();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [prizeMode, setPrizeMode] = useState("back2");
  const [question, setQuestion] = useState("");
  const [freeResp, setFreeResp] = useState("");
  const [freeLoad, setFreeLoad] = useState(false);
  const [aiContext, setAiContext] = useState(null);

  // Collapsible Panels Toggle States
  const [showTuner, setShowTuner] = useState(false);
  const [showBacktest, setShowBacktest] = useState(false);

  // AI Hyperparameters (Weights Ratio)
  const [weightPos, setWeightPos] = useState(25);
  const [weightRec, setWeightRec] = useState(25);
  const [weightMarkov, setWeightMarkov] = useState(30);
  const [weightCooc, setWeightCooc] = useState(20);

  // Structural Constraint Filters
  const [filterOddEven, setFilterOddEven] = useState(true);
  const [filterHighLow, setFilterHighLow] = useState(true);
  const [blockConsecutive, setBlockConsecutive] = useState(false);

  // Engine Registry state — active version (only used when ENGINE_REGISTRY_ENABLED)
  const [activeEngineId, setActiveEngineId] = useState("v1");

  // Backtester States
  const [backtestDepth, setBacktestDepth] = useState(10);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestResult, setBacktestResult] = useState(null);

  // Sync default prizeMode and reset all states when lotteryType switches
  useEffect(() => {
    setPrizeMode(lotteryType === "lao" ? "tail4" : "back2");
    
    // Clear prediction & backtest states
    setResult(null);
    setBacktestResult(null);
    setBacktestLoading(false);
    
    // Clear Q&A input and response
    setQuestion("");
    setFreeResp("");
    setFreeLoad(false);
    setAiContext(null);
    
    // Reset panels
    setShowTuner(false);
    setShowBacktest(false);
    
    // Reset hyperparameters to defaults
    setWeightPos(25);
    setWeightRec(25);
    setWeightMarkov(30);
    setWeightCooc(20);
    
    // Reset constraint filters
    setFilterOddEven(true);
    setFilterHighLow(true);
    setBlockConsecutive(false);
    
    // Reset backtest depth
    setBacktestDepth(10);

    // Reset engine selection to v1 baseline on lottery type switch
    setActiveEngineId("v1");
  }, [lotteryType]);

  /**
   * Resolve the active scoring configuration.
   *
   * Resolution order:
   *   1. Registry disabled  → legacy tuner slider values (full backward compat).
   *   2. Registry enabled, v2 active, DYNAMIC_WEIGHTS enabled
   *                         → findBestWeights() [optimizer, memoized].
   *                           Falls back to resolveEngineConfig("v1") on error.
   *   3. Registry enabled, any other engine or DYNAMIC_WEIGHTS disabled
   *                         → resolveEngineConfig(activeEngineId).
   *
   * @returns {{ weightPos, weightRec, weightMarkov, weightCooc,
   *             filterOddEven, filterHighLow, blockConsecutive }}
   */
  function getActiveConfig() {
    if (ENGINE_REGISTRY_ENABLED) {
      // Route Engine v2 through the Grid Search optimizer when the flag is on
      if (activeEngineId === "v2" && DYNAMIC_WEIGHTS_ENABLED) {
        try {
          return findBestWeights(history, prizeMode, lotteryType, backtestDepth);
        } catch (err) {
          console.error('[LottoLens:optimizer] findBestWeights failed — falling back to v1', err);
          return resolveEngineConfig("v1");
        }
      }
      // All other engines (or v2 with optimizer flag off) → static registry config
      return resolveEngineConfig(activeEngineId);
    }
    // Legacy path — reads directly from the manual tuner slider state
    return { weightPos, weightRec, weightMarkov, weightCooc, filterOddEven, filterHighLow, blockConsecutive };
  }

  const nextDraw = lotteryType === "lao" ? getNextLaoDraw() : getNextDraw();

  const THAI_PRIZE_META = {
    back2: { label: "เลขท้าย 2 ตัว", digits: 2, color: "var(--red)", icon: Target, desc: "Combo Score × Markov × Recency" },
    back3: { label: "เลขท้าย 3 ตัว", digits: 3, color: "var(--blue)", icon: TrendingUp, desc: "Positional Entropy × Z-score" },
    front3: { label: "เลขหน้า 3 ตัว", digits: 3, color: "var(--green)", icon: Shield, desc: "Transition Matrix × Gap Analysis" },
    first: { label: "รางวัลที่ 1", digits: 6, color: "var(--accent)", icon: Award, desc: "Full Positional × Markov Chain" },
  };

  const LAO_PRIZE_META = {
    tail4: { label: "เลขท้าย 4 ตัว", digits: 4, color: "var(--lao-accent)", icon: Award, desc: "Full Positional × Markov Chain" },
    top3: { label: "เลขท้าย 3 ตัว", digits: 3, color: "var(--green)", icon: Shield, desc: "Positional Entropy × Z-score" },
    top2: { label: "เลขท้าย 2 ตัว", digits: 2, color: "var(--blue)", icon: Target, desc: "Combo Score × Markov × Recency" },
  };

  const PRIZE_META = lotteryType === "lao" ? LAO_PRIZE_META : THAI_PRIZE_META;
  const meta = PRIZE_META[prizeMode] || { label: "วิเคราะห์", digits: 2, color: "var(--accent)", icon: Target, desc: "" };

  /**
   * Run client-side mathematical prediction model (UnifiedAIPredict)
   */
  async function handlePredict() {
    setLoading(true); 
    setResult(null);
    // Add artificial delay to give realistic processing feedback in the UI
    await new Promise(r => setTimeout(r, 1500));

    try {
      const config = getActiveConfig();

      const predResult = calculateUnifiedAIPredict(history, prizeMode, lotteryType, config);
      setResult(predResult);

      // Construct Real-time Analytics Context for the bottom strip display
      const len = getDigitLength(prizeMode, lotteryType);
      const seq = history
        .map(row => getActualNumberForDraw(row, prizeMode, lotteryType))
        .filter(Boolean)
        .map(s => String(s).padStart(len, "0"));

      const posFreqs = Array.from({ length: len }, () => Array(10).fill(0));
      seq.forEach(numStr => {
        numStr.split("").forEach((char, p) => {
          const digit = Number(char);
          if (!isNaN(digit)) posFreqs[p][digit]++;
        });
      });

      const mappedPos = posFreqs.map(pos =>
        pos.map((count, digit) => ({ digit, count })).sort((a, b) => b.count - a.count)
      );

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

      const lastNumStr = seq[0] || "";
      const markovPreds = [];
      if (lastNumStr) {
        for (let p = 0; p < len; p++) {
          const fromDigit = Number(lastNumStr[p]);
          if (!isNaN(fromDigit)) {
            const transitions = posTransitions[p][fromDigit];
            const maxTrans = Math.max(...transitions);
            const topDigit = transitions.indexOf(maxTrans);
            markovPreds.push({ next_number: `${p + 1}:${topDigit}` });
          }
        }
      }

      setAiContext({
        Positional: mappedPos,
        Markov: markovPreds,
        LastNum: lastNumStr || "N/A",
      });

    } catch (err) {
      console.error("Predict Error:", err);
      // Fallback response
      setResult({
        confidence: 50,
        core: "0".repeat(meta.digits),
        primary: ["0".repeat(meta.digits)],
        backup: ["0".repeat(meta.digits)],
        methods: ["Fallback Mode"],
        logic: "เกิดข้อผิดพลาดในการคำนวณสถิติ กรุณาลองปรับค่าน้ำหนักอีกครั้ง",
      });
    }
    setLoading(false);
  }

  /**
   * Run historical simulation for the simulator panel
   */
  async function handleRunBacktest() {
    setBacktestLoading(true);
    setBacktestResult(null);
    await new Promise(r => setTimeout(r, 1200));

    try {
      const config = getActiveConfig();

      const res = runHistoricalBacktest(history, prizeMode, lotteryType, config, backtestDepth);

      let runningHits = 0;
      const chartData = res.details.slice().reverse().map((d, index) => {
        if (d.isHit) runningHits++;
        const cumulativeRate = Math.round((runningHits / (index + 1)) * 100);
        return {
          index: index + 1,
          cumulativeRate,
        };
      });

      setBacktestResult({
        ...res,
        chartData,
      });

    } catch (err) {
      console.error("Backtest Error:", err);
    }
    setBacktestLoading(false);
  }

  /**
   * Custom AI Question helper
   */
  async function handleFree() {
    if (!question.trim()) return;
    setFreeLoad(true); 
    setFreeResp("");
    try {
      let contextStr = "";
      if (lotteryType === "lao") {
        contextStr = `Lao Lottery Statistical Context:
- Hot digits: ${stats?.hot.map(h => h.d).join(", ")}
- Cold digits: ${stats?.cold.map(c => c.d).join(", ")}
- Top 2-digit combinations: ${stats?.combo.slice(0, 5).map(c => c.n).join(", ")}`;
      } else {
        const resp = await fetchAIContext(prizeMode);
        contextStr = resp.context;
      }

      const prompt = `คุณเป็น Senior Data Scientist เชี่ยวชาญสถิติหวย${lotteryType === "lao" ? "ลาวพัฒนา" : "ไทย"}
ข้อมูลสถิติปัจจุบัน (${prizeMode}):
${contextStr}

คำถามจากผู้ใช้: ${question}`;

      const aiResp = await callGemini(
        prompt,
        `คุณเป็น Senior Data Scientist เชี่ยวชาญสถิติหวย${lotteryType === "lao" ? "ลาว" : "ไทย"} ตอบภาษาไทย กระชับ ตรงประเด็น`,
        { skipContext: true }
      );

      if (aiResp && typeof aiResp === 'object' && aiResp.error) {
        setFreeResp(`ข้อผิดพลาด: ${aiResp.message}`);
      } else {
        setFreeResp(aiResp || "ไม่ได้รับคำตอบจากระบบ กรุณาลองใหม่");
      }
    } catch { 
      setFreeResp("เกิดข้อผิดพลาด กรุณาลองใหม่"); 
    }
    setFreeLoad(false);
  }

  const QUICK = lotteryType === "lao" ? [
    "สรุปแนวโน้ม เลขท้าย 2 ตัวหวยลาวจากข้อมูลทั้งหมด",
    "วิเคราะห์ pattern เลขเบิ้ลหวยลาว",
    "วิเคราะห์หลักพัน vs หลักร้อย หวยลาวพัฒนา",
    "เลขชุด เลขท้าย 2 ตัวที่สถิติดีที่สุด พร้อมเหตุผล",
  ] : [
    "สรุปแนวโน้ม เลขท้าย 2 ตัวจากข้อมูลทั้งหมด",
    "วิเคราะห์ pattern งวดวันที่ 1 vs 16",
    "เปรียบเทียบ เลขหน้า 3 ตัว vs เลขท้าย 3 ตัว ว่าต่างกันอย่างไร",
    "เลขชุดไหนควรซื้อสำหรับงวดหน้า พร้อมเหตุผล",
  ];

  const confColor = result
    ? result.confidence >= 72 ? "var(--green)" : result.confidence >= 60 ? "var(--accent)" : "var(--red)"
    : "var(--accent)";

  const coreCircle = meta.digits <= 2
    ? { size: 80, fontSize: 34, letterSpacing: 0 }
    : meta.digits <= 3
    ? { size: 80, fontSize: 26, letterSpacing: 0 }
    : meta.digits <= 4
    ? { size: 96, fontSize: 20, letterSpacing: 1 }
    : { size: 128, fontSize: 15, letterSpacing: 0.5 };

  return (
    <div className="fade">
      <div className="ai-hero mt">
        <div className="ai-glow" style={{ background: lotteryType === "lao" ? "var(--lao-accent)" : "var(--blue)", top: -80, right: -80, width: 200, height: 200 }} />
        <div className="ai-glow" style={{ background: "var(--accent)", bottom: -80, left: -80, width: 200, height: 200 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <Bot size={40} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ fontFamily: "Playfair Display,serif", fontSize: 22, fontWeight: 900, color: "var(--accent3)", marginBottom: 6 }}>
            {lotteryType === "lao" ? "Lao Lottery AI Predictor" : "Thai Lottery AI Predictor"}
          </div>
          <p style={{ fontSize: 12, color: "var(--txt3)", margin: "0 auto 16px", maxWidth: 480 }}>
            UnifiedAIPredict Engine · Multi-Model Voting · Positional Freq · Recency Gap · Markov Chain · Co-occurrence Matrix
          </p>

          {/* Prize mode selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>เลือกประเภทรางวัล</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {Object.entries(PRIZE_META).map(([k, m]) => {
                const IconComponent = m.icon;
                return (
                  <div key={k} className={`mode-card${prizeMode === k ? " on" : ""}`}
                    style={{ minWidth: 100, borderColor: prizeMode === k ? m.color : "var(--bdr2)" }}
                    onClick={() => { setPrizeMode(k); setResult(null); setBacktestResult(null); }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, marginTop: 4 }}>
                      <IconComponent size={22} style={{ color: prizeMode === k ? m.color : "var(--txt3)" }} />
                    </div>
                    <div style={{ fontFamily: "Chakra Petch,sans-serif", fontSize: 14, fontWeight: 700, color: prizeMode === k ? m.color : "var(--txt3)" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 3 }}>{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Engine Registry Selector ─────────────────────────────────────
               Rendered ONLY when VITE_ENABLE_ENGINE_REGISTRY === "true".
               Allows switching the active scoring engine version; changing the
               selection immediately clears stale prediction + backtest results
               to ensure the UI always reflects the selected engine's metrics.
          ────────────────────────────────────────────────────────────────── */}
          {ENGINE_REGISTRY_ENABLED && (() => {
            const activeEngine = ENGINE_REGISTRY.get(activeEngineId) ?? ENGINE_REGISTRY.get("v1");
            const resolvedCfg  = resolveEngineConfig(activeEngineId);
            const isStable      = activeEngine.status === "stable";
            const statusColor   = isStable ? "var(--green)" : "#f59e0b";
            return (
              <div
                id="engine-registry-selector"
                role="group"
                aria-label="Engine Version Selector"
                style={{
                  marginBottom: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${statusColor}44`,
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Cpu size={14} style={{ color: statusColor }} aria-hidden="true" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "Chakra Petch, monospace" }}>
                    Engine Registry
                  </span>
                  <span style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 0.5 }}>— Version Control Matrix</span>
                </div>

                {/* Dropdown + status badge row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label
                      htmlFor="select-engine-version"
                      style={{ fontSize: 12, color: "var(--txt2)", whiteSpace: "nowrap" }}
                    >
                      Engine Version:
                    </label>
                    <select
                      id="select-engine-version"
                      value={activeEngineId}
                      onChange={e => {
                        setActiveEngineId(e.target.value);
                        // Clear stale results so the UI always reflects the active engine
                        setResult(null);
                        setBacktestResult(null);
                      }}
                      className="inp"
                      style={{ padding: "5px 10px", fontSize: 12, minHeight: 32, minWidth: 280 }}
                    >
                      {[...ENGINE_REGISTRY.entries()].map(([key, eng]) => (
                        <option key={key} value={key}>{eng.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status badge */}
                  <span
                    aria-label={`Engine status: ${activeEngine.status}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      background: `${statusColor}18`,
                      border: `1px solid ${statusColor}55`,
                      borderRadius: 6, padding: "3px 9px",
                      fontSize: 12, color: statusColor, fontWeight: 700,
                      fontFamily: "Chakra Petch, monospace", letterSpacing: 1,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                    {activeEngine.status.toUpperCase()}
                  </span>
                </div>

                {/* Engine description */}
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--txt3)", fontStyle: "italic" }}>
                  {activeEngine.description}
                </div>

                {/* Active weight strip */}
                <div
                  id="engine-weight-strip"
                  style={{
                    marginTop: 10,
                    padding: "7px 10px",
                    background: "var(--s1)",
                    border: "1px solid var(--bdr2)",
                    borderRadius: 8,
                    display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 1, textTransform: "uppercase" }}>Active Weights:</span>
                  {[
                    { label: "Pos",    value: resolvedCfg.weightPos,    color: "var(--gold)"   },
                    { label: "Rec",    value: resolvedCfg.weightRec,    color: "var(--cyan)"   },
                    { label: "Markov", value: resolvedCfg.weightMarkov, color: "var(--purple)" },
                    { label: "Cooc",   value: resolvedCfg.weightCooc,   color: "var(--green)"  },
                  ].map(w => (
                    <span key={w.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <span style={{ color: w.color, fontFamily: "Chakra Petch, monospace", fontWeight: 700 }}>{w.value}%</span>
                      <span style={{ color: "var(--txt3)" }}>{w.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* ── /Engine Registry Selector ─────────────────────────────────── */}

          <div style={{ fontSize: 12, color: "#ef9a9a", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} />
            <span>วิเคราะห์เชิงสถิติขั้นสูง (เป็นเพียงแนวทางความน่าจะเป็นเท่านั้น)</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--txt3)", marginBottom: 14 }}>
            งวดเป้าหมาย: <strong style={{ color: "var(--accent2)" }}>{nextDraw}</strong>
            &nbsp;·&nbsp;ฐานข้อมูล {history.length} งวด
          </div>

          <button id="btn-predict" className="btn btn-g" onClick={handlePredict} disabled={loading}
            style={{ fontSize: 14, padding: "11px 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {loading ? (
              <>
                <Sparkles size={14} className="spin" />
                <span>กำลังคำนวณสถิติ {meta.label}...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>รันโมเดลทำนาย {meta.label}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Hyperparameter Tuner Panel */}
      <div className="card mt" style={{ border: "1px solid var(--bdr)" }}>
        <div 
          className="ctitle" 
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", margin: 0, paddingBottom: showTuner ? 12 : 0, borderBottom: showTuner ? "1px solid var(--bdr2)" : "none", userSelect: "none" }}
          onClick={() => setShowTuner(!showTuner)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sliders size={16} style={{ color: "var(--accent)" }} />
            <span>ตัวปรับแต่งน้ำหนักความน่าจะเป็น (Weights Tuner)</span>
            <span className="csub">({weightPos}% สถิติ, {weightRec}% ช่วงงวด, {weightMarkov}% มาร์คอฟ, {weightCooc}% เลขคู่)</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--txt3)" }}>{showTuner ? "▲ ซ่อนแผงตั้งค่า" : "▼ เปิดแผงตั้งค่า"}</span>
        </div>

        {showTuner && (
          <div className="fade mt" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 12, color: "var(--txt3)", lineHeight: 1.5 }}>
                ปรับแต่งสัดส่วนน้ำหนัก (Weights Ratio) ของแต่ละโมเดลการคำนวณและตัวกรองเชิงโครงสร้าง เพื่อวิเคราะห์ตัวเลขเด่นตามสูตรของคุณ
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setWeightPos(25);
                  setWeightRec(25);
                  setWeightMarkov(30);
                  setWeightCooc(20);
                  setFilterOddEven(true);
                  setFilterHighLow(true);
                  setBlockConsecutive(false);
                }}
                className="fchip"
                style={{ height: "28px", minHeight: "28px", padding: "0 10px", flexShrink: 0 }}
              >
                คืนค่าเริ่มต้น
              </button>
            </div>

            <div className="grid-res sm:grid-cols-2" style={{ gap: 16 }}>
              {/* Sliders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--txt2)" }}>Positional Weight (ความถี่หลักสถิติ)</span>
                    <span style={{ color: "var(--gold)" }}>{weightPos}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightPos} 
                    onChange={e => setWeightPos(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--txt2)" }}>Recency Weight (น้ำหนักช่วงงวด / Gap)</span>
                    <span style={{ color: "var(--cyan)" }}>{weightRec}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightRec} 
                    onChange={e => setWeightRec(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--txt2)" }}>Markov Chain Weight (การเปลี่ยนผ่านของตัวเลข)</span>
                    <span style={{ color: "var(--purple)" }}>{weightMarkov}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightMarkov} 
                    onChange={e => setWeightMarkov(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--txt2)" }}>Co-occurrence Weight (คู่ตัวเลขสัมพันธ์ร่วม)</span>
                    <span style={{ color: "var(--green)" }}>{weightCooc}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightCooc} 
                    onChange={e => setWeightCooc(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: "var(--txt2)", marginBottom: 4 }}>
                  Structural Constraint Filters (ตัวกรองโครงสร้างตัวเลขสมดุล)
                </div>

                <div className="tgl" tabIndex="0" onClick={() => setFilterOddEven(!filterOddEven)} onKeyDown={e => e.key === ' ' && setFilterOddEven(!filterOddEven)}>
                  <div style={{ fontSize: 12, color: "var(--txt)" }}>คู่/คี่ สมดุล (Odd/Even Balance)</div>
                  <div className={`tgl-track${filterOddEven ? " on" : ""}`}>
                    <div className="tgl-thumb" />
                  </div>
                </div>

                <div className="tgl" tabIndex="0" onClick={() => setFilterHighLow(!filterHighLow)} onKeyDown={e => e.key === ' ' && setFilterHighLow(!filterHighLow)}>
                  <div style={{ fontSize: 12, color: "var(--txt)" }}>สูง/ต่ำ สมดุล (High/Low Balance)</div>
                  <div className={`tgl-track${filterHighLow ? " on" : ""}`}>
                    <div className="tgl-thumb" />
                  </div>
                </div>

                <div className="tgl" tabIndex="0" onClick={() => setBlockConsecutive(!blockConsecutive)} onKeyDown={e => e.key === ' ' && setBlockConsecutive(!blockConsecutive)}>
                  <div style={{ fontSize: 12, color: "var(--txt)" }}>คัดกรองเลขเรียง (Block Consecutive)</div>
                  <div className={`tgl-track${blockConsecutive ? " on" : ""}`}>
                    <div className="tgl-thumb" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="card mt" style={{ textAlign: "center", padding: 28 }}>
          <Skeleton height={200} className="mb" />
          <div style={{ fontSize: 13, color: "var(--txt3)", marginTop: 10 }}>
            กำลังวิเคราะห์ข้อมูลด้วยน้ำหนักที่กำหนด กำลังประมวลผลโมเดลคณิตศาสตร์...
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="fade mt">
          {result.methods?.length > 0 && (
            <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {result.methods.map((m, i) => (
                <span key={i} style={{ background: lotteryType === "lao" ? "rgba(167,139,250,0.1)" : "rgba(61,142,240,0.1)", border: lotteryType === "lao" ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(61,142,240,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Check size={10} />
                  <span>{m}</span>
                </span>
              ))}
            </div>
          )}

          <div className="grid-res grid-cols-1 md:grid-cols-2">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card" style={{ textAlign: "center" }}>
                <div className="ctitle" style={{ justifyContent: "center", gap: "6px" }}>
                  <Target size={14} style={{ color: "var(--accent)" }} />
                  <span>เลขเด่นหลัก (Core)</span>
                </div>
                <div style={{
                  width: coreCircle.size, height: coreCircle.size, borderRadius: "50%",
                  background: `radial-gradient(circle,${meta.color}33,${meta.color}11)`,
                  border: `2.5px solid ${meta.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Chakra Petch,sans-serif",
                  fontSize: coreCircle.fontSize,
                  fontWeight: 900, color: meta.color, margin: "0 auto 8px",
                  boxShadow: `0 0 20px ${meta.color}44`,
                  letterSpacing: coreCircle.letterSpacing,
                  lineHeight: 1,
                  boxSizing: "border-box",
                  padding: meta.digits >= 4 ? "0 6px" : 0,
                }}>
                  {result.core}
                </div>
                <div style={{ fontSize: 12, color: "var(--txt3)" }}>ค่าน้ำหนักความถี่สูงสุดจากการคำนวณ</div>
              </div>

              <div className="card" style={{ textAlign: "center" }}>
                <div className="ctitle" style={{ justifyContent: "center", gap: "6px" }}>
                  <TrendingUp size={14} style={{ color: "var(--accent)" }} />
                  <span>ดัชนีความน่าเชื่อถือทางสถิติ</span>
                </div>
                <div className="ring-wrap">
                  <svg width="92" height="92">
                    <circle cx="46" cy="46" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
                    <circle cx="46" cy="46" r="36" fill="none" stroke={confColor} strokeWidth="9"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - result.confidence / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 46 46)"
                      style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                  </svg>
                  <span className="ring-val" style={{ color: confColor }}>{result.confidence}%</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 6 }}>
                  {result.confidence >= 72 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} /> น้ำหนักสถิติสูง</span>
                  ) : result.confidence >= 60 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} /> ปานกลาง</span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} /> ความไม่แน่นอนสูง</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="ctitle" style={{ gap: "6px" }}>
                <Target size={14} style={{ color: "var(--accent)" }} />
                <span>ชุดเลขหลัก: {meta.label} (Primary)</span>
                <span className="prize-badge pb-back2" style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}15` }}>{meta.label}</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
                {result.primary?.map((n, i) => (
                  <div key={i} style={{
                    position: "relative",
                    minWidth: meta.digits === 6 ? 80 : meta.digits === 3 ? 68 : 58,
                    height: meta.digits === 6 ? 58 : 68,
                    background: `linear-gradient(135deg,${meta.color}22,${meta.color}08)`,
                    border: `1.5px solid ${i === 0 ? meta.color : "rgba(201,149,42,0.2)"}`,
                    borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Chakra Petch,sans-serif",
                    fontSize: meta.digits === 6 ? 14 : meta.digits === 3 ? 20 : 28,
                    fontWeight: 700, color: i === 0 ? meta.color : "var(--txt)", letterSpacing: meta.digits > 2 ? 2 : 3,
                    boxShadow: i === 0 ? `0 4px 16px ${meta.color}33` : "none",
                  }}>
                    {n}
                    {i === 0 && <div style={{ position: "absolute", top: -8, right: -6, fontSize: 12, background: meta.color, color: "#000", borderRadius: 4, padding: "1px 5px", fontFamily: "sans-serif", fontWeight: 700 }}>#1</div>}
                  </div>
                ))}
              </div>

              <div className="ctitle" style={{ gap: "6px" }}>
                <Shield size={14} style={{ color: "var(--txt3)" }} />
                <span>ชุดสำรอง (Backup)</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                {result.backup?.map((n, i) => (
                  <div key={i} style={{
                    minWidth: 52, height: 52, background: "var(--s1)", border: "1px solid var(--bdr2)",
                    borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Chakra Petch,sans-serif", fontSize: meta.digits === 6 ? 13 : meta.digits === 3 ? 18 : 22,
                    fontWeight: 700, color: "var(--txt3)", letterSpacing: 2,
                  }}>{n}</div>
                ))}
              </div>

              <div style={{ background: "var(--s1)", borderRadius: 11, padding: 14, border: "1px solid var(--bdr2)" }}>
                <div style={{ fontSize: 12, color: meta.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center", gap: "6px" }}>
                  <BarChart3 size={12} />
                  <span>หลักการวิเคราะห์เชิงคณิตศาสตร์</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.82, color: "var(--txt)" }}>{result.logic}</p>
              </div>
            </div>
          </div>

          {/* Math strip */}
          <div className="card" style={{ marginTop: 0 }}>
            <div className="ctitle" style={{ gap: "6px" }}>
              <Target size={14} style={{ color: "var(--accent)" }} />
              <span>ดัชนีวิเคราะห์สถิติจริงแบบเรียลไทม์ (Real-time Context)</span>
            </div>
            {aiContext ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {aiContext.Positional.map((pos, i) => (
                  <div key={i} style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 90 }}>
                    <div style={{ fontSize: 8, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>หลักที่ {i + 1}</div>
                    <div style={{ fontFamily: "Chakra Petch,sans-serif", fontSize: 18, color: "var(--gold2)" }}>{pos[0]?.digit ?? "?"}</div>
                    <div style={{ fontSize: 12, color: "var(--txt3)" }}>Freq: {pos[0]?.count ?? 0}</div>
                  </div>
                ))}
                {aiContext.Markov && (
                  <div style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 120 }}>
                    <div style={{ fontSize: 8, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Markov Next</div>
                    <div style={{ fontSize: 12, color: "var(--txt)" }}>{(aiContext.Markov || []).slice(0, 3).map(m => m.next_number).join(", ") || "N/A"}</div>
                  </div>
                )}
                {stats?.zScores && (
                  <div style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 120 }}>
                    <div style={{ fontSize: 8, color: "var(--red)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Z-score (Top)</div>
                    <div style={{ fontSize: 12, color: "var(--txt)" }}>{(stats.zScores || []).slice(-1).map(z => `Digit ${z.digit}: ${z.z_score.toFixed(2)}`).join("") || "N/A"}</div>
                  </div>
                )}
                <div style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 120 }}>
                  <div style={{ fontSize: 8, color: "var(--cyan)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Last Draw</div>
                  <div style={{ fontSize: 12, color: "var(--txt)" }}>{aiContext.LastNum || "N/A"}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--txt3)", textAlign: "center", padding: 10 }}>กดวิเคราะห์เพื่อคำนวณค่าน้ำหนักสถิติจริงแบบ Real-time</div>
            )}
          </div>

          {/* Entropy Panel — Shannon Entropy per digit position */}
          <EntropyPanel
            history={history}
            mode={prizeMode}
            lotteryType={lotteryType}
          />

          {/* Evidence Panel — component score breakdown for the top-ranked candidate */}
          <EvidencePanel evidence={result?.evidence} accentColor={meta.color} />
        </div>
      )}

      {/* Historical Backtesting Simulator Panel */}
      <div className="card mt" style={{ border: "1px solid var(--bdr)" }}>
        <div 
          className="ctitle" 
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", margin: 0, paddingBottom: showBacktest ? 12 : 0, borderBottom: showBacktest ? "1px solid var(--bdr2)" : "none", userSelect: "none" }}
          onClick={() => setShowBacktest(!showBacktest)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Play size={16} style={{ color: "var(--accent)" }} />
            <span>ระบบจำลองผลวิเคราะห์ย้อนหลัง (Backtesting Simulator)</span>
            {backtestResult && (
              <span className="tag" style={{ border: "none", padding: "1px 6px", background: "rgba(34,197,94,0.15)", color: "var(--green)" }}>
                Hit Rate: {backtestResult.hitRate}%
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: "var(--txt3)" }}>{showBacktest ? "▲ ซ่อนแผงจำลอง" : "▼ เปิดแผงจำลอง"}</span>
        </div>

        {showBacktest && (
          <div className="fade mt" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 12, color: "var(--txt3)", lineHeight: 1.5 }}>
              รันแบบจำลองการทำนายย้อนหลังตามจำนวนงวดจริง เพื่อวัดความถูกต้องของค่าน้ำหนักและ Constraints ที่คุณตั้งค่าไว้ โดยระบบจะถือว่าถูกรางวัล (HIT) เมื่อเลขรางวัลจริงอยู่ในรายชื่อ 4 เลขทำนายหลัก (Primary)
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--txt2)" }}>ทดสอบย้อนหลัง:</span>
                <select 
                  value={backtestDepth} 
                  onChange={e => setBacktestDepth(Number(e.target.value))}
                  className="inp" 
                  style={{ width: 100, padding: "6px 10px", fontSize: 13, minHeight: 34 }}
                >
                  <option value={10}>10 งวด</option>
                  <option value={20}>20 งวด</option>
                  <option value={30}>30 งวด</option>
                  <option value={50}>50 งวด</option>
                </select>
              </div>

              <button 
                className="btn btn-g" 
                onClick={handleRunBacktest} 
                disabled={backtestLoading}
                style={{ padding: "6px 16px", minHeight: 34, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
              >
                {backtestLoading ? (
                  <>
                    <Sparkles size={12} className="spin" />
                    <span>กำลังจำลอง...</span>
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    <span>เริ่มการทดสอบ</span>
                  </>
                )}
              </button>
            </div>

            {backtestResult && (
              <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Historical Performance Tracking — multi-tier hit rate dashboard */}
                <PerformanceTrackingPanel
                  hitRateTop10={backtestResult.hitRateTop10 ?? 0}
                  hitRateTop20={backtestResult.hitRateTop20 ?? 0}
                  hitRateTop50={backtestResult.hitRateTop50 ?? 0}
                  total={backtestResult.total}
                />

                <div className="grid-res sm:grid-cols-3" style={{ gap: 14 }}>
                  <div className="sbox">
                    <div className="sv" style={{ color: backtestResult.hitRate >= 40 ? "var(--green)" : backtestResult.hitRate >= 20 ? "var(--gold)" : "var(--red)" }}>
                      {backtestResult.hitRate}%
                    </div>
                    <div className="sl">อัตราความถูกต้อง (Hit Rate)</div>
                  </div>
                  
                  <div className="sbox">
                    <div className="sv">{backtestResult.hits} / {backtestResult.total}</div>
                    <div className="sl">จำลองถูกรางวัล (Hits)</div>
                  </div>

                  <div className="sbox">
                    <div className="sv">{history.length} งวด</div>
                    <div className="sl">ฐานข้อมูลย้อนหลัง</div>
                  </div>
                </div>

                {/* Line Chart showing accuracy trend */}
                <div className="sbox" style={{ padding: "16px 8px", height: 200 }}>
                  <div style={{ fontSize: 12, color: "var(--txt3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "left", paddingLeft: 8 }}>
                    แนวโน้มอัตราการเข้าเป้าสะสม (Cumulative Hit Rate Trend)
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={backtestResult.chartData}>
                      <XAxis dataKey="index" stroke="var(--txt3)" fontSize={9} tickLine={false} />
                      <YAxis hide={true} domain={[0, 110]} />
                      <Tooltip 
                        contentStyle={{ background: "var(--s1)", borderColor: "var(--bdr)", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(lbl) => `งวดที่ทดสอบ ${lbl}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeRate" 
                        stroke="var(--accent)" 
                        strokeWidth={2.5} 
                        dot={{ fill: "var(--accent)", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Draw logs */}
                <div>
                  <div style={{ fontSize: 12, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    บันทึกผลจำลองรายงวด (Backtest Log Breakdown)
                  </div>
                  <div className="tbl-wrap" style={{ maxHeight: 220 }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>งวดวันที่</th>
                          <th>รางวัลจริง</th>
                          <th>ตัวทำนายเด่นหลัก (Primary Group)</th>
                          <th>ผลวิเคราะห์</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResult.details.map((d, i) => (
                          <tr key={i}>
                            <td>{d.date}</td>
                            <td style={{ fontFamily: "Chakra Petch", fontWeight: "bold", fontSize: 14, color: "var(--txt)" }}>{d.actual}</td>
                            <td style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 1.5 }}>{d.predicted}</td>
                            <td>
                              {d.isHit ? (
                                <span style={{ color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: "bold", fontSize: 12 }}>
                                  ✓ HIT (เข้าเป้า)
                                </span>
                              ) : (
                                <span style={{ color: "var(--txt3)", opacity: 0.6, fontSize: 12 }}>
                                  ✗ MISS (ไม่เข้า)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Free Q&A Section */}
      <div className="card mt">
        <div className="ctitle" style={{ gap: "6px" }}>
          <MessageSquare size={14} style={{ color: "var(--accent)" }} />
          <span>ถาม AI วิเคราะห์สถิติอิสระ</span>
        </div>
        <div className="fchips" style={{ marginBottom: 10 }}>
          {QUICK.map((q, i) => (
            <button key={i} className="fchip" onClick={() => setQuestion(q)}>{q}</button>
          ))}
        </div>
        <div className="fg">
          <input id="inp-question" className="inp" style={{ flex: 1 }} value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="เช่น วิเคราะห์แนวโน้มหวยงวดหน้า..."
            onKeyDown={e => e.key === "Enter" && !freeLoad && handleFree()} />
          <button id="btn-free-ask" className="btn btn-b" onClick={handleFree} disabled={freeLoad || !question.trim()}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            {freeLoad ? (
              <Sparkles size={14} className="spin" />
            ) : (
              <>
                <Search size={14} />
                <span>ถาม</span>
              </>
            )}
          </button>
        </div>
        {(freeResp || freeLoad) && (
          <div 
            className={`ai-resp${freeLoad ? " loading" : ""}`} 
            style={freeLoad ? { display: "flex", gap: "6px", alignItems: "center" } : { display: "block" }}
          >
            {freeLoad ? (
              <>
                <Sparkles size={14} className="spin" style={{ color: "var(--accent)" }} />
                <span>กำลังส่งคำถามถึง AI...</span>
              </>
            ) : (
              renderMarkdown(freeResp)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
