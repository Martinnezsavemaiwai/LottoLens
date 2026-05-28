import { useState, useEffect, useMemo } from "react";
import { callGemini } from "../../services/gemini";
import { fetchAIContext } from "../../services/api";
import { getNextDraw, getNextLaoDraw, parseJson } from "../../utils/helpers";
import { useLottery } from "../../context/LotteryContext";
import Skeleton from "../ui/Skeleton";
import { Bot, Shield, Target, TrendingUp, AlertTriangle, MessageSquare, Search, Sparkles, Check, Award, BarChart3 } from "lucide-react";

/**
 * Tab: AIPredict — วิเคราะห์หวยด้วย Gemini AI
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

  // Sync default prizeMode when lotteryType switches
  useEffect(() => {
    setPrizeMode(lotteryType === "lao" ? "tail4" : "back2");
    setResult(null);
    setAiContext(null);
  }, [lotteryType]);

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

  function buildFallback(mc, customLogic) {
    const primary = meta.digits === 6 ? ["123456", "654321"] : meta.digits === 4 ? ["1122", "3344"] : meta.digits === 3 ? ["111", "222"] : ["11", "22"];
    return {
      confidence: 50,
      core: "?",
      primary,
      backup: meta.digits === 6 ? ["999999"] : ["55", "77"],
      methods: ["Fallback Pattern"],
      logic: customLogic || "ไม่สามารถประมวลผลข้อมูลสถิติได้ในขณะนี้",
    };
  }

  async function handlePredict() {
    setLoading(true); setResult(null);
    try {
      let contextStr = "";
      let rawStatsObj = null;

      if (lotteryType === "lao") {
        // Lao Mode: Construct rich mathematical context on client side from our mathEngine
        const posFreqMap = stats
          ? (prizeMode === "tail4" ? stats.tail4PosFreq : prizeMode === "top3" ? stats.top3PosFreq : prizeMode === "top2" ? stats.top2PosFreq : stats.bot2PosFreq)
          : [];

        const mappedPos = (posFreqMap || []).map(pos =>
          pos.map((count, digit) => ({ digit, count })).sort((a, b) => b.count - a.count)
        );

        rawStatsObj = {
          Positional: mappedPos,
          LastNum: history[0]?.tail4 || "N/A",
          HotDigits: stats?.hot.map(h => h.d) || [],
          ColdDigits: stats?.cold.map(c => c.d) || [],
          Overdue: stats?.overdue.map(o => o.d) || [],
        };

        contextStr = `Lao Lottery Advanced Mathematical Stats:
- Total analyzed draws: ${history.length}
- Last draw tail4 number: ${rawStatsObj.LastNum}
- Hot active digits (Highest freq): ${rawStatsObj.HotDigits.join(", ")}
- Cold active digits (Lowest freq): ${rawStatsObj.ColdDigits.join(", ")}
- Overdue digits (Max gap): ${rawStatsObj.Overdue.join(", ")}
- Position Frequency breakdown: ${JSON.stringify(mappedPos)}`;

        if (stats?.zScores) {
          contextStr += `\n- Digit Z-Scores (strictly scoped to Lao fields, higher score indicates hotter digit): ${stats.zScores.map(z => `Digit ${z.digit}: ${z.z_score.toFixed(2)}`).join(", ")}`;
        }

        setAiContext(rawStatsObj);
      } else {
        // Thai Mode: Call standard v1 backend context endpoint
        const resp = await fetchAIContext(prizeMode);
        rawStatsObj = resp.raw_stats;
        contextStr = resp.context;
        setAiContext(resp.raw_stats);
      }

      const prompt = lotteryType === "lao"
        ? `คุณเป็น Senior Data Scientist วิเคราะห์หวยพัฒนาของประเทศลาวด้วยสถิติขั้นสูง

งวดเป้าหมาย: หวยลาวงวดถัดไป | โหมด: ${meta.label} (${meta.digits} หลัก)
ฐานข้อมูล: ${history.length} งวด

── Mathematical Analysis Context (Go Stats Engine) ──
${contextStr}

กระบวนการวิเคราะห์:
1. Positional Probability — วิเคราะห์หลักที่มีความน่าจะเป็นสูงสุด
2. Markov Transition — วิเคราะห์เลขที่มักจะออกต่อจากงวดล่าสุด
3. Z-score reversion — วิเคราะห์เลขที่ขาดหายไปนาน (Overdue)
4. Recency weighting — ให้ความสำคัญกับงวดล่าสุดมากกว่า

ตอบเป็น JSON เท่านั้น โดยค่า core ต้องเป็นตัวเดียวกับ primary ชุดแรก:
{"confidence":<50-80>,"core":"<${meta.digits}หลัก ตัวเดียวกับ primary ชุดแรก>","primary":["<${meta.digits}หลัก ตัวเดียวกับ core>","<${meta.digits}หลัก>","<${meta.digits}หลัก>","<${meta.digits}หลัก>"],"backup":["<${meta.digits}หลัก>","<${meta.digits}หลัก>"],"methods":["วิธี1","วิธี2","วิธี3"],"logic":"<อธิบาย 3-4 ประโยค อ้างอิงค่าสถิติจริง ห้ามมี markdown หรือ backticks>"}`
        : `คุณเป็น Senior Data Scientist วิเคราะห์หวยรัฐบาลไทยด้วยสถิติขั้นสูง

งวดเป้าหมาย: ${nextDraw} | โหมด: ${meta.label} (${meta.digits} หลัก)
ฐานข้อมูล: ${history.length} งวด

── Mathematical Analysis Context (ClickHouse) ──
${contextStr}

กระบวนการวิเคราะห์:
1. Positional Probability — วิเคราะห์หลักที่มีความน่าจะเป็นสูงสุด
2. Markov Transition — วิเคราะห์เลขที่มักจะออกต่อจากงวดล่าสุด
3. Z-score reversion — วิเคราะห์เลขที่ขาดหายไปนาน (Overdue)
4. Recency weighting — ให้ความสำคัญกับงวดล่าสุดมากกว่า

ตอบเป็น JSON เท่านั้น โดยค่า core ต้องเป็นตัวเดียวกับ primary ชุดแรก:
{"confidence":<50-80>,"core":"<${meta.digits}หลัก ตัวเดียวกับ primary ชุดแรก>","primary":["<${meta.digits}หลัก ตัวเดียวกับ core>","<${meta.digits}หลัก>","<${meta.digits}หลัก>","<${meta.digits}หลัก>"],"backup":["<${meta.digits}หลัก>","<${meta.digits}หลัก>"],"methods":["วิธี1","วิธี2","วิธี3"],"logic":"<อธิบาย 3-4 ประโยค อ้างอิงค่าสถิติจริง ห้ามมี markdown หรือ backticks>"}`;

      const aiResp = await callGemini(prompt, "ตอบ JSON เท่านั้น ไม่มี markdown ไม่มี backtick");

      if (aiResp && typeof aiResp === 'object' && aiResp.error) {
        setResult(buildFallback(null, aiResp.message));
        setLoading(false);
        return;
      }

      const parsed = parseJson(aiResp);
      if (parsed?.primary?.length > 0) {
        // Force sync between core and primary #1 to avoid user confusion
        parsed.core = parsed.primary[0];
      }
      setResult(parsed?.primary ? parsed : buildFallback());
    } catch (err) {
      console.error("Predict Error:", err);
      setResult(buildFallback());
    }
    setLoading(false);
  }

  async function handleFree() {
    if (!question.trim()) return;
    setFreeLoad(true); setFreeResp("");
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
        `คุณเป็น Senior Data Scientist เชี่ยวชาญสถิติหวย${lotteryType === "lao" ? "ลาว" : "ไทย"} ตอบภาษาไทย กระชับ ตรงประเด็น`
      );

      if (aiResp && typeof aiResp === 'object' && aiResp.error) {
        setFreeResp(`ข้อผิดพลาด: ${aiResp.message}`);
      } else {
        setFreeResp(aiResp || "ไม่ได้รับคำตอบจากระบบ กรุณาลองใหม่");
      }
    } catch { setFreeResp("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
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
          <p style={{ fontSize: 11, color: "var(--txt3)", margin: "0 auto 16px", maxWidth: 480 }}>
            Positional Entropy · Markov Chain · Z-score · Recency Weighting · pattern analysis · Probability Matrix
          </p>

          {/* Prize mode selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 9, color: "var(--txt3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>เลือกประเภทรางวัล</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {Object.entries(PRIZE_META).map(([k, m]) => {
                const IconComponent = m.icon;
                return (
                  <div key={k} className={`mode-card${prizeMode === k ? " on" : ""}`}
                    style={{ minWidth: 100, borderColor: prizeMode === k ? m.color : "var(--bdr2)" }}
                    onClick={() => { setPrizeMode(k); setResult(null); }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, marginTop: 4 }}>
                      <IconComponent size={22} style={{ color: prizeMode === k ? m.color : "var(--txt3)" }} />
                    </div>
                    <div style={{ fontFamily: "Chakra Petch,sans-serif", fontSize: 14, fontWeight: 700, color: prizeMode === k ? m.color : "var(--txt3)" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--txt3)", marginTop: 3 }}>{m.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#ef9a9a", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} />
            <span>วิเคราะห์เชิงสถิติ — ไม่รับประกันผล</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--txt3)", marginBottom: 14 }}>
            งวดเป้าหมาย: <strong style={{ color: "var(--accent2)" }}>{nextDraw}</strong>
            &nbsp;·&nbsp;ฐานข้อมูล {history.length} งวด
          </div>

          <button id="btn-predict" className="btn btn-g" onClick={handlePredict} disabled={loading}
            style={{ fontSize: 14, padding: "11px 28px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {loading ? (
              <>
                <Sparkles size={14} className="spin" />
                <span>ประมวลผล {meta.label}...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>วิเคราะห์ {meta.label}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card mt" style={{ textAlign: "center", padding: 28 }}>
          <Skeleton height={200} className="mb" />
          <div style={{ fontSize: 13, color: "var(--txt3)", marginTop: 10 }}>
            กำลังรัน Markov + Positional Entropy + Z-score + Recency Weighting...
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="fade mt">
          {result.methods?.length > 0 && (
            <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {result.methods.map((m, i) => (
                <span key={i} style={{ background: lotteryType === "lao" ? "rgba(167,139,250,0.1)" : "rgba(61,142,240,0.1)", border: lotteryType === "lao" ? "1px solid rgba(167,139,250,0.25)" : "1px solid rgba(61,142,240,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
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
                  <span>เลขเด่น (Core)</span>
                </div>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: `radial-gradient(circle,${meta.color}33,${meta.color}11)`,
                  border: `2.5px solid ${meta.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Chakra Petch,sans-serif",
                  fontSize: meta.digits <= 2 ? 34 : meta.digits <= 3 ? 26 : 18,
                  fontWeight: 900, color: meta.color, margin: "0 auto 8px",
                  boxShadow: `0 0 20px ${meta.color}44`,
                  letterSpacing: meta.digits > 3 ? 2 : 0,
                }}>
                  {result.core}
                </div>
                <div style={{ fontSize: 10, color: "var(--txt3)" }}>Highest positional score</div>
              </div>

              <div className="card" style={{ textAlign: "center" }}>
                <div className="ctitle" style={{ justifyContent: "center", gap: "6px" }}>
                  <TrendingUp size={14} style={{ color: "var(--accent)" }} />
                  <span>Statistical Confidence</span>
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
                <div style={{ fontSize: 10, color: "var(--txt3)", marginTop: 6 }}>
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
                <span>ชุดเลขหลัก — {meta.label} (Primary)</span>
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
                    {i === 0 && <div style={{ position: "absolute", top: -8, right: -6, fontSize: 9, background: meta.color, color: "#000", borderRadius: 4, padding: "1px 5px", fontFamily: "sans-serif", fontWeight: 700 }}>#1</div>}
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
                <div style={{ fontSize: 9, color: meta.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center", gap: "6px" }}>
                  <BarChart3 size={12} />
                  <span>Mathematical Analysis Logic</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.82, color: "var(--txt)" }}>{result.logic}</p>
              </div>
            </div>
          </div>

          {/* Math strip */}
          <div className="card" style={{ marginTop: 0 }}>
            <div className="ctitle" style={{ gap: "6px" }}>
              <Target size={14} style={{ color: "var(--accent)" }} />
              <span>กระบวนการวิเคราะห์ที่ใช้ (Real-time Analytics Context)</span>
            </div>
            {aiContext ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {aiContext.Positional.map((pos, i) => (
                  <div key={i} style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 90 }}>
                    <div style={{ fontSize: 8, color: "var(--gold)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>หลักที่ {i + 1}</div>
                    <div style={{ fontFamily: "Chakra Petch,sans-serif", fontSize: 18, color: "var(--gold2)" }}>{pos[0]?.digit ?? "?"}</div>
                    <div style={{ fontSize: 9, color: "var(--txt3)" }}>Freq: {pos[0]?.count ?? 0}</div>
                  </div>
                ))}
                {aiContext.Markov && (
                  <div style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 120 }}>
                    <div style={{ fontSize: 8, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Markov Next</div>
                    <div style={{ fontSize: 11, color: "var(--txt)" }}>{(aiContext.Markov || []).slice(0, 3).map(m => m.next_number).join(", ") || "N/A"}</div>
                  </div>
                )}
                {stats?.zScores && (
                  <div style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 120 }}>
                    <div style={{ fontSize: 8, color: "var(--red)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Z-score (Top)</div>
                    <div style={{ fontSize: 11, color: "var(--txt)" }}>{(stats.zScores || []).slice(-1).map(z => `Digit ${z.digit}: ${z.z_score.toFixed(2)}`).join("") || "N/A"}</div>
                  </div>
                )}
                <div style={{ background: "var(--s2)", border: "1px solid var(--bdr2)", borderRadius: 9, padding: "8px 12px", minWidth: 120 }}>
                  <div style={{ fontSize: 8, color: "var(--cyan)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Last Draw</div>
                  <div style={{ fontSize: 11, color: "var(--txt)" }}>{aiContext.LastNum || "N/A"}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--txt3)", textAlign: "center", padding: 10 }}>กดวิเคราะห์เพื่อดึงข้อมูลสถิติสดแบบ Real-time</div>
            )}
          </div>
        </div>
      )}

      {/* Free Q&A */}
      <div className="card mt">
        <div className="ctitle" style={{ gap: "6px" }}>
          <MessageSquare size={14} style={{ color: "var(--accent)" }} />
          <span>ถาม AI อิสระ</span>
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
          <div className={`ai-resp${freeLoad ? " loading" : ""}`} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {freeLoad ? (
              <>
                <Sparkles size={14} className="spin" style={{ color: "var(--accent)" }} />
                <span>กำลังวิเคราะห์...</span>
              </>
            ) : (
              freeResp
            )}
          </div>
        )}
      </div>
    </div>
  );
}
