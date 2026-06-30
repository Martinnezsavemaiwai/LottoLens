import { useState, useEffect } from "react";
import { callGemini } from "../../services/gemini";
import { parseJson } from "../../utils/helpers";
import { Sparkles, Dices, Flame, Gift, Moon, Target, BarChart3, AlertTriangle, Snowflake, Award, Search, Send, Lightbulb, Check } from "lucide-react";
import { useLottery } from "../../context/LotteryContext";

/**
 * Tab: Tools — Smart Pick, Dream interpreter, AI Scorer
 * Supports both Thai and Lao modes
 * @param {{ stats: Object }} props
 */
export default function Tools({ stats }) {
  const { lotteryType } = useLottery();
  const isLao = lotteryType === "lao";

  const [mode, setMode]               = useState("random");
  const [prizeType, setPrizeType]     = useState(isLao ? "tail4" : "back2");
  const [exCold, setExCold]           = useState(false);
  const [exDbl, setExDbl]             = useState(false);
  const [dob, setDob]                 = useState("");
  const [dream, setDream]             = useState("");
  const [evalNum, setEvalNum]         = useState("");
  const [generated, setGenerated]     = useState(null);
  const [genHistory, setGenHistory]   = useState([]);
  const [rightContent, setRightContent] = useState("idle");
  const [dreamNote, setDreamNote]     = useState("");
  const [evalData, setEvalData]       = useState(null);
  const [loading, setLoading]         = useState("");

  // Reset all states and sync default prizeType when lotteryType switches
  useEffect(() => {
    setPrizeType(isLao ? "tail4" : "back2");
    setMode("random");
    setExCold(false);
    setExDbl(false);
    setDob("");
    setDream("");
    setEvalNum("");
    setGenerated(null);
    setGenHistory([]);
    setRightContent("idle");
    setDreamNote("");
    setEvalData(null);
    setLoading("");
  }, [lotteryType, isLao]);

  // Prize types per mode
  const PRIZE_TYPES = isLao
    ? [["tail4", "4 ตัวท้าย"], ["top2", "เลขท้าย 2 ตัว"]]
    : [["back2", "เลขท้าย 2 ตัว"], ["back3", "เลขท้าย 3 ตัว"], ["front3", "เลขหน้า 3 ตัว"], ["first", "รางวัลที่ 1"]];

  // Digits count per prize type
  const DIGITS_MAP = { back2: 2, back3: 3, front3: 3, first: 6, tail4: 4, top2: 2 };
  const digits = DIGITS_MAP[prizeType] || 2;

  // Valid digit counts for eval input (Thai: 2,3,6 / Lao: 2,4)
  const VALID_EVAL_LENGTHS = isLao ? [2, 4] : [2, 3, 6];
  const isValidEvalLength = VALID_EVAL_LENGTHS.includes(evalNum.length);

  // Auto-detect and lock prize type when eval input changes
  function handleEvalChange(val) {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setEvalNum(clean);
    const len = clean.length;
    if (isLao) {
      if (len === 4) setPrizeType("tail4");
      else if (len === 2) setPrizeType("top2");
    } else {
      if (len === 2) setPrizeType("back2");
      else if (len === 3 && prizeType !== "front3") setPrizeType("back3");
      else if (len === 6) setPrizeType("first");
    }
  }

  // Prize label for AI prompt
  const prizeLabel = isLao
    ? (prizeType === "tail4" ? "4 ตัวท้าย (หวยลาวพัฒนา)" : "เลขท้าย 2 ตัว (หวยลาวพัฒนา)")
    : (prizeType === "back2" ? "เลขท้าย 2 ตัว" : prizeType === "back3" ? "เลขท้าย 3 ตัว" : prizeType === "front3" ? "เลขหน้า 3 ตัว" : "รางวัลที่ 1");

  function pickRandom(len) {
    let pool = [0,1,2,3,4,5,6,7,8,9];
    if (exCold) pool = pool.filter(d => !stats.coldSet.has(d));
    if (mode === "hot") pool = [...stats.hot.map(h => h.d)];
    if (!pool.length) pool = [0,1,2,3,4,5,6,7,8,9];
    let num, tries = 0;
    do {
      tries++;
      num = Array.from({length:len}, () => pool[Math.floor(Math.random()*pool.length)]).join("");
      if (exDbl && num.length >= 2 && num[num.length-1] === num[num.length-2]) num = null;
    } while (!num && tries < 5000);
    return num || String(Math.floor(Math.random()*Math.pow(10,len))).padStart(len,"0");
  }

  function handleGenerate() {
    let num;
    if (mode === "birthday" && dob) {
      const parts = dob.replace(/-/g,"");
      const pool = [...new Set(parts.split(""))];
      while (pool.length < digits) pool.push(String(Math.floor(Math.random()*10)));
      num = pool.slice(0,digits).sort(() => Math.random()-.5).join("");
    } else { num = pickRandom(digits); }
    setGenerated(num);
    setGenHistory(h => [num,...h.slice(0,8)]);
    setDreamNote(""); setEvalData(null); setRightContent("gen");
  }

  async function handleDream() {
    if (!dream.trim()) return;
    setLoading("dream"); setDreamNote("");
    const lotteryName = isLao ? "หวยลาวพัฒนา" : "หวยรัฐบาลไทย";
    const prompt = `ตีความฝันและหาเลขมงคล${lotteryName}: "${dream}" ตอบ JSON: {"meaning":"ความหมายของฝัน","lucky2":"เลข2หลัก","lucky3":"เลข3หลัก","lucky4":"เลข4หลัก","reason":"เหตุผลสั้นๆ"}`;
    try {
      const text = await callGemini(prompt, "ตอบ JSON เท่านั้น", { skipContext: true });
      if (text && typeof text === 'object' && text.error) {
        setDreamNote(text.message);
        setGenerated(null);
        setRightContent("gen");
        setLoading("");
        return;
      }
      const p = parseJson(text);
      if (p) {
        setDreamNote(`${p.meaning}${p.reason ? ` (${p.reason})` : ""}`);
        let luckyNum;
        if (digits === 4) luckyNum = p.lucky4 || p.lucky3 || p.lucky2 || "??";
        else if (digits === 3) luckyNum = p.lucky3 || p.lucky2 || "??";
        else luckyNum = p.lucky2 || "??";
        setGenerated(luckyNum);
        setGenHistory(h => [luckyNum,...h.slice(0,8)].filter(Boolean));
        setRightContent("gen");
      } else {
        setDreamNote("ไม่สามารถแปลผลความฝันได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
        setGenerated(null);
        setRightContent("gen");
      }
    } catch {
      setDreamNote("เกิดข้อผิดพลาดในการวิเคราะห์ความฝัน");
      setGenerated(null);
      setRightContent("gen");
    }
    setLoading("");
  }

  async function handleEval() {
    if (!evalNum.trim()) return;
    setLoading("eval"); setEvalData(null);

    let prompt;
    if (isLao) {
      const top3tail4 = (stats.tail4Arr || []).slice(0,3).map(x => x.n).join(",");
      const top3top2  = (stats.top2Arr  || []).slice(0,3).map(x => x.n).join(",");
      const comboTop3 = (stats.combo    || []).slice(0,3).map(c => c.n).join(",");
      prompt = `ประเมินชุดเลข "${evalNum}" สำหรับ${prizeLabel}
สถิติ: Top3Tail4=${top3tail4}, Top3Top2=${top3top2}, ComboScore=${comboTop3}
Hot=${stats.hot.map(h=>h.d).join(",")}, Cold=${stats.cold.map(c=>c.d).join(",")}
ตอบ JSON: {"score":คะแนน1-10,"verdict":"ดีมาก/ดี/ปานกลาง/อ่อน","reason":"2-3 ประโยคภาษาไทย อ้างอิงสถิติ"}`;
    } else {
      const combo3    = stats.combo.slice(0,3).map(c=>c.n).join(",");
      const back2Top3 = (stats.back2Arr||[]).slice(0,3).map(x=>x.n).join(",");
      const back3Top3 = (stats.back3Arr||[]).slice(0,3).map(x=>x.n).join(",");
      prompt = `ประเมินชุดเลข "${evalNum}" สำหรับหวยรัฐบาลไทย ${prizeLabel}
สถิติ: Combo2ล่างTop3=${combo3}, Hot=${stats.hot.map(h=>h.d).join(",")}, Cold=${stats.cold.map(c=>c.d).join(",")}
Top2ล่าง=${back2Top3}, Top3ล่าง=${back3Top3}
ตอบ JSON: {"score":คะแนน1-10,"verdict":"ดีมาก/ดี/ปานกลาง/อ่อน","reason":"2-3 ประโยคภาษาไทย อ้างอิงสถิติ"}`;
    }

    try {
      const text = await callGemini(prompt, "ตอบ JSON เท่านั้น", { skipContext: true });
      if (text && typeof text === 'object' && text.error) {
        setEvalData({
          score: 0,
          verdict: "เกิดข้อผิดพลาด",
          reason: text.message,
        });
      } else {
        setEvalData(parseJson(text) || { score: 5, verdict: "ปานกลาง", reason: "ไม่สามารถประเมินได้" });
      }
    } catch {
      setEvalData({ score: 5, verdict: "ปานกลาง", reason: "เกิดข้อผิดพลาดในการประเมิน" });
    }
    setLoading(""); setRightContent("eval");
  }

  function handleQuickFill(valueString) {
    const parts = valueString.split("·");
    const firstNum = parts[0].trim().replace(/[^\d]/g, "");
    if (!firstNum) return;

    const len = firstNum.length;
    if (isLao) {
      if (len === 4) setPrizeType("tail4");
      else if (len === 2) setPrizeType("top2");
    } else {
      if (len === 6) setPrizeType("first");
      else if (len === 3) setPrizeType("back3");
      else if (len === 2) setPrizeType("back2");
    }
    setEvalNum(firstNum);

    // Auto-focus input
    setTimeout(() => {
      const el = document.getElementById("inp-eval");
      if (el) el.focus();
    }, 50);
  }

  const MODES = [
    { id: "random",   l: "สุ่ม",     icon: Dices },
    { id: "hot",      l: "Hot",      icon: Flame    },
    { id: "birthday", l: "วันเกิด",  icon: Gift     },
    { id: "dream",    l: "ฝัน",      icon: Moon     }
  ];

  const evalColor = evalData
    ? (evalData.score >= 7 ? "var(--green)" : evalData.score >= 5 ? "var(--gold)" : "var(--red)")
    : "var(--txt3)";

  // Quick reference data — Lao vs Thai
  const quickRefData = isLao ? [
    { label: "Hot digits",     val: stats.hot.map(h=>h.d).join(" · "),                          c: "var(--accent)",    icon: Flame   },
    { label: "Cold digits",    val: stats.cold.map(c=>c.d).join(" · "),                         c: "var(--accent2)",   icon: Snowflake},
    { label: "Top 4 ตัวท้าย", val: (stats.tail4Arr||[]).slice(0,3).map(c=>c.n).join(" · "),    c: "var(--accent3)",   icon: Award   },
    { label: "Top เลขท้าย 2 ตัว",   val: (stats.top2Arr||[]).slice(0,3).map(c=>c.n).join(" · "),     c: "var(--accent)",    icon: Target  },
  ] : [
    { label: "Hot digits",  val: stats.hot.map(h=>h.d).join(" · "),                              c: "var(--red)",    icon: Flame   },
    { label: "Cold digits", val: stats.cold.map(c=>c.d).join(" · "),                             c: "var(--blue)",   icon: Snowflake},
    { label: "2ล่าง Top3",  val: stats.combo.slice(0,3).map(c=>c.n).join(" · "),                c: "var(--gold2)",  icon: Award   },
    { label: "3ล่าง Top3",  val: (stats.back3Arr||[]).slice(0,3).map(c=>c.n).join(" · "),       c: "var(--blue)",   icon: Target  },
  ];

  return (
    <div className="fade">
      <div className="grid-res grid-cols-1 lg:grid-cols-12 mt" style={{ gap: "24px", marginBottom: "32px" }}>
        
        {/* Left Column: Smart Pick & AI Scorer (span-5) */}
        <div className="lg:col-span-5" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Smart Pick */}
          <div className="card tonal-card luxury-shadow" style={{ padding: "40px" }}>
            <div className="ctitle" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Sparkles size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.2em" }}>Smart Pick</span>
              {isLao && <span className="csub">หวยลาวพัฒนา</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Mode Filters */}
              <div>
                <span style={{ fontSize: "11px", color: "var(--txt3)", fontWeight: 500, letterSpacing: "normal", display: "block", marginBottom: "12px" }}>โหมดการสุ่ม</span>
                <div className="pill-row">
                  {MODES.map(m => {
                    const IconComponent = m.icon;
                    const isActive = mode === m.id;
                    return (
                      <button 
                        key={m.id} 
                        className={`pill-button ${isActive ? "active-pill" : "inactive-pill"}`} 
                        onClick={() => {
                          setMode(m.id);
                          // Reset generated results if moving to dream mode so they see the input box
                          if (m.id === "dream") {
                            setRightContent("idle");
                          }
                        }}
                      >
                        <IconComponent size={12} />
                        <span>{m.l}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number Type Filters */}
              <div style={{ paddingTop: "20px", borderTop: "1px solid var(--bdr2)" }}>
                <span style={{ fontSize: "11px", color: "var(--txt3)", fontWeight: 500, display: "block", marginBottom: "12px" }}>
                  ประเภท
                </span>
                <div className="pill-row">
                  {PRIZE_TYPES.map(([k, l]) => (
                    <button 
                      key={k} 
                      className={`pill-button pill-button--sm ${prizeType === k ? "active-pill" : "inactive-pill"}`} 
                      onClick={() => setPrizeType(k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Inputs */}
              {mode === "birthday" && (
                <div className="fade" style={{ paddingTop: "20px", borderTop: "1px solid var(--bdr2)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "11px", color: "var(--txt3)", fontWeight: 500 }}>
                    วันเกิด (คริสต์ศักราช)
                  </label>
                  <input 
                    type="date" 
                    className="understated-input" 
                    value={dob} 
                    onChange={e => setDob(e.target.value)} 
                    style={{ width: "100%", padding: "10px 0", fontSize: "14px", color: "var(--txt)" }}
                  />
                </div>
              )}

              {mode === "dream" && (
                <div className="fade" style={{ paddingTop: "20px", borderTop: "1px solid var(--bdr2)" }}>
                  <p style={{ fontSize: "12px", color: "var(--txt2)", lineHeight: "1.6", fontWeight: 300, display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <Lightbulb size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "3px" }} />
                    <span>กรุณากรอกรายละเอียดความฝันของคุณในกล่อง “ตัวแปลความฝัน AI” ทางด้านขวา เพื่อให้ระบบวิเคราะห์และสกัดเลขมงคล</span>
                  </p>
                </div>
              )}

              {/* Toggles */}
              {mode !== "dream" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="tool-toggle" onClick={() => setExCold(!exCold)}>
                    <span style={{ fontSize: "13px", fontWeight: 300, color: "var(--txt)" }}>
                      ตัดเลขดับ (Cold: {stats.cold.map(c => c.d).join(",")})
                    </span>
                    <div className={`switch-track${exCold ? " on" : ""}`}>
                      <div className="switch-thumb" />
                    </div>
                  </div>

                  <div className="tool-toggle" onClick={() => setExDbl(!exDbl)}>
                    <span style={{ fontSize: "13px", fontWeight: 300, color: "var(--txt)" }}>
                      ตัดเลขเบิ้ล (00,11,22...)
                    </span>
                    <div className={`switch-track${exDbl ? " on" : ""}`}>
                      <div className="switch-thumb" />
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              {mode !== "dream" && (
                <button 
                  id="btn-generate" 
                  className="btn-primary-stitch"
                  style={{ width: "100%", padding: "15px 0" }}
                  onClick={handleGenerate}
                >
                  <Sparkles size={16} />
                  <span>สร้างเลข</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Scorer */}
          <div className="card tonal-card luxury-shadow" style={{ padding: "40px" }}>
            <div className="ctitle" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <BarChart3 size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.2em" }}>AI Scorer</span>
              <span className="csub">ประเมินชุดเลข</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "11px", color: "var(--txt3)", fontWeight: 500 }}>
                  {isLao ? "พิมพ์ชุดเลข (2 หรือ 4 หลัก)" : "พิมพ์ชุดเลข (2, 3 หรือ 6 หลัก)"}
                </label>
                <input 
                  id="inp-eval" 
                  className="understated-input" 
                  style={{ width: "100%", padding: "12px 0", fontSize: "20px", fontWeight: 300, letterSpacing: evalNum ? "4px" : "normal", color: "var(--txt)" }}
                  placeholder="พิมพ์ตัวเลข..."
                  value={evalNum} 
                  onChange={e => handleEvalChange(e.target.value)}
                />
                {/* Status row: show detected prize type or warning */}
                <div style={{ minHeight: "22px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {evalNum.length > 0 && isValidEvalLength && (
                    <span style={{
                      fontSize: "11px", fontWeight: 500,
                      color: "var(--accent)", letterSpacing: "0.05em",
                      display: "flex", alignItems: "center", gap: "5px"
                    }}>
                      <Check size={12} />
                      {prizeLabel}
                    </span>
                  )}
                  {evalNum.length > 0 && !isValidEvalLength && (
                    <span style={{ fontSize: "11px", color: "var(--txt3)", fontStyle: "italic" }}>
                      {isLao ? "รองรับ 2 หรือ 4 หลัก" : "รองรับ 2, 3 หรือ 6 หลัก"}
                    </span>
                  )}
                </div>
              </div>

              {/* 3-digit ambiguity: let user pick back3 vs front3 */}
              {!isLao && evalNum.length === 3 && (
                <div className="fade">
                  <span style={{ fontSize: "11px", color: "var(--txt3)", fontWeight: 500, display: "block", marginBottom: "8px" }}>
                    ประเภทเลข 3 หลัก
                  </span>
                  <div className="pill-row">
                    {[["back3", "เลขท้าย 3 ตัว"], ["front3", "เลขหน้า 3 ตัว"]].map(([k, l]) => (
                      <button
                        key={k}
                        className={`pill-button pill-button--sm ${prizeType === k ? "active-pill" : "inactive-pill"}`}
                        onClick={() => setPrizeType(k)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                id="btn-eval" 
                className="btn-primary-stitch"
                style={{ width: "100%", padding: "15px 0" }}
                onClick={handleEval} 
                disabled={loading === "eval" || !isValidEvalLength || !evalNum.trim()}
              >
                {loading === "eval" ? (
                  <>
                    <Sparkles size={16} className="spin" />
                    <span>กำลังวิเคราะห์...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>ประเมินด้วย AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Display / Dream AI (span-7) */}
        <div className="lg:col-span-7">
          <div 
            className="card tonal-card luxury-shadow" 
            style={{ 
              minHeight: "560px", 
              height: "100%", 
              display: "flex", 
              flexDirection: "column", 
              padding: "40px", 
              position: "relative", 
              overflow: "hidden" 
            }}
          >
            {/* Background Decorative River Stones (from Stitch Design) */}
            <div 
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "50%",
                height: "100%",
                opacity: 0.3,
                pointerEvents: "none",
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDECOCAksLZEFmnqOISbuZSDxpLAecaZRACATpeh-Ht7VDafsAcVCuRrj2SHL7ljHpv0xNUa-b4tbL3urx3zN3PJ49_cb1zbZp2w7Hg2I1VONRVwaYN554dMdpN9Z1IE2e2EUjO9BegMZkpD22FQXhu2VJXJJPmNt7L_2JXFHUx_dLpWP-LsswoZuUBkJXukPKCe2ocdUfc59ZoBzdauEFZ0JSgwvQ_VsalEwZY_Lr52271IpTmiglsY9bvMXaf3B98kRzGTG899bKd')`,
                backgroundSize: "cover",
                backgroundPosition: "bottom right",
                maskImage: "linear-gradient(to top left, black 20%, transparent 80%)",
                WebkitMaskImage: "linear-gradient(to top left, black 20%, transparent 80%)"
              }} 
            />

            {/* Content Switcher */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
              {rightContent === "idle" && mode === "dream" && (
                <div className="fade" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  {/* Dream Interpreter AI Input Area */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                    <Moon size={18} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--txt3)" }}>
                      ตัวแปลความฝัน AI
                    </span>
                  </div>

                  <div style={{ maxWidth: "480px" }}>
                    <h3 style={{ 
                      fontFamily: "'Sarabun', sans-serif", 
                      fontSize: "26px", 
                      fontWeight: 600,
                      color: "var(--accent)", 
                      marginBottom: "16px" 
                    }}>
                      ถอดรหัสจากจิตใต้สำนึก
                    </h3>
                    <p style={{ fontSize: "14px", color: "var(--txt2)", lineHeight: "1.8", marginBottom: "32px", fontWeight: 300 }}>
                      เล่ารายละเอียดความฝันของคุณให้มากที่สุดเท่าที่จะนึกออก ระบบ AI จะวิเคราะห์และสกัดเลขมงคลที่ซ่อนอยู่ในความฝันของคุณ
                    </p>

                    <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", minHeight: "220px" }}>
                      <textarea
                        id="dream-textarea"
                        placeholder="ฉันฝันว่ากำลังเดินอยู่ในป่าที่มีใบไม้เป็นสีเงิน..."
                        value={dream}
                        onChange={e => setDream(e.target.value)}
                        disabled={loading === "dream"}
                        style={{
                          width: "100%",
                          minHeight: "220px",
                          background: "var(--s2)",
                          border: "1px solid var(--bdr2)",
                          padding: "24px",
                          paddingRight: "56px",
                          fontSize: "16px",
                          fontWeight: 300,
                          lineHeight: "1.7",
                          resize: "none",
                          color: "var(--txt)",
                          outline: "none",
                          fontFamily: "inherit"
                        }}
                      />
                      <button 
                        onClick={handleDream}
                        disabled={loading === "dream" || !dream.trim()}
                        style={{
                          position: "absolute",
                          bottom: "24px",
                          right: "24px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: dream.trim() ? "var(--accent)" : "var(--txt3)",
                          transition: "transform 0.3s cubic-bezier(0.19, 1, 0.22, 1)",
                          opacity: dream.trim() ? 1 : 0.4
                        }}

                      >
                        {loading === "dream" ? <Moon size={20} className="spin" /> : <Send size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {rightContent === "idle" && mode !== "dream" && (
                <div className="fade" style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", alignItems: "center", zIndex: 2 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.35, padding: "40px" }}>
                    <Dices size={56} style={{ color: "var(--accent)", marginBottom: "16px", strokeWidth: 1 }} />
                    <p style={{ textAlign: "center", fontSize: "14px", fontStyle: "italic", fontWeight: 300, color: "var(--txt)", lineHeight: "1.6" }}>
                      กดปุ่มสร้างเลข หรือพิมพ์ประเมินชุดเลขด้านซ้าย<br />เพื่อเริ่มการวิเคราะห์เชิงลึก
                    </p>
                  </div>
                </div>
              )}

              {rightContent === "gen" && (
                <div className="fade" style={{ width: "100%", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, zIndex: 2 }}>
                  {generated ? (
                    <>
                      <div style={{ fontSize: "11px", color: "var(--txt3)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "14px", fontWeight: 500 }}>
                        ผลลัพธ์การคำนวณ
                      </div>
                      <div className="nbig" style={{ 
                        fontSize: "64px", 
                        fontFamily: "Playfair Display, serif", 
                        fontWeight: 700, 
                        color: "var(--accent)", 
                        letterSpacing: "8px", 
                        margin: "12px 0",
                        padding: "24px 0"
                      }}>
                        {generated}
                      </div>
                      <div className="nsubs" style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "8px", color: "var(--txt2)", fontSize: "14px", fontWeight: 300 }}>
                        {generated.length >= 4 && <span>4 ตัว: <strong>{generated.slice(-4)}</strong></span>}
                        {generated.length >= 3 && <span>3 ตัว: <strong>{generated.slice(-3)}</strong></span>}
                        <span>2 ตัว: <strong>{generated.slice(-2)}</strong></span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
                      <AlertTriangle size={48} style={{ color: "var(--red)", marginBottom: "12px" }} />
                      <span style={{ fontSize: "13px", color: "var(--txt2)" }}>การประมวลผลขัดข้อง</span>
                    </div>
                  )}

                  {dreamNote && (
                    <div 
                      style={{
                        marginTop: "32px",
                        background: "var(--s2)",
                        border: "1px solid var(--bdr)",
                        borderRadius: "2px",
                        padding: "20px",
                        fontSize: "14px",
                        lineHeight: "1.7",
                        textAlign: "left", 
                        display: "flex", 
                        gap: "12px", 
                        alignItems: "flex-start"
                      }}
                    >
                      <Moon size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "4px" }} />
                      <div style={{ color: "var(--txt)", fontWeight: 300 }}>{dreamNote}</div>
                    </div>
                  )}

                  {generated && genHistory.length > 1 && (
                    <div style={{ marginTop: "32px" }}>
                      <div style={{ fontSize: "10px", color: "var(--txt3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>
                        ประวัติชุดตัวเลขที่สกัด
                      </div>
                      <div className="chips" style={{ justifyContent: "center", gap: "10px" }}>
                        {genHistory.slice(1, 6).map((n, i) => (
                          <span key={i} className="chip" style={{ opacity: 1 - i * 0.18, display: "inline-block", background: "var(--s2)", border: "1px solid var(--bdr2)", padding: "4px 12px" }}>
                            <span className="chip-num" style={{ fontSize: "12px", color: "var(--txt)", fontFamily: "monospace" }}>{n}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "40px" }}>
                    <button 
                      className="pill-button inactive-pill" 
                      onClick={() => {
                        setRightContent("idle");
                        setDream("");
                      }}
                      style={{ padding: "10px 28px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}
                    >
                      กลับไปแปลฝัน / เคลียร์ค่า
                    </button>
                  </div>
                </div>
              )}

              {rightContent === "eval" && (
                <div className="fade" style={{ width: "100%", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, zIndex: 2 }}>
                  {evalData && (
                    <>
                      <div style={{ fontSize: "11px", color: "var(--txt3)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "14px", fontWeight: 500 }}>
                        คะแนนประเมินโดย AI Scorer
                      </div>
                      
                      {evalData.score > 0 ? (
                        <>
                          <div style={{ fontSize: "72px", fontFamily: "Playfair Display, serif", fontWeight: 700, color: evalColor, lineHeight: "1.1", marginBottom: "8px" }}>
                            {evalData.score}<span style={{ fontSize: "24px", color: "var(--txt3)", fontWeight: 300 }}>/10</span>
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: evalColor, marginBottom: "24px" }}>
                            {evalData.verdict}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
                          <AlertTriangle size={48} style={{ color: "var(--red)", marginBottom: "12px" }} />
                          <span style={{ fontSize: "13px", color: "var(--txt2)" }}>การประเมินผิดพลาด</span>
                        </div>
                      )}

                      <div 
                        style={{
                          background: "var(--s2)",
                          border: "1px solid var(--bdr)",
                          borderRadius: "2px",
                          padding: "20px",
                          fontSize: "14px",
                          lineHeight: "1.8",
                          textAlign: "left", 
                          display: "flex", 
                          gap: "12px", 
                          alignItems: "flex-start"
                        }}
                      >
                        {evalData.score === 0 ? (
                          <AlertTriangle size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: "4px" }} />
                        ) : (
                          <Sparkles size={16} style={{ color: evalColor, flexShrink: 0, marginTop: "4px" }} />
                        )}
                        <div style={{ color: "var(--txt)", fontWeight: 300 }}>{evalData.reason}</div>
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: "40px" }}>
                    <button 
                      className="pill-button inactive-pill" 
                      onClick={() => setRightContent("idle")}
                      style={{ padding: "10px 28px", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}
                    >
                      ประเมินเลขอื่น
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick reference */}
      <div className="card tonal-card luxury-shadow" style={{ padding: "40px" }}>
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Award size={14} style={{ color: "var(--accent)" }} />
          <span>ข้อมูลอ้างอิงสำหรับเลือกเลข</span>
          {isLao && <span className="csub">หวยลาวพัฒนา</span>}
        </div>
        <div className="grid-res sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
          {quickRefData.map((x, i) => {
            const Icon = x.icon;
            // Mode-aware visual colors to break identical cards pattern
            const customStyle = isLao ? {
              borderColor: "var(--accent-bdr-tint)",
              background: "linear-gradient(180deg, var(--s1), var(--accent-tint2))"
            } : {
              "var(--red)": { borderColor: "var(--red-bdr-tint)", background: "linear-gradient(180deg, var(--s1), var(--red-tint))" },
              "var(--blue)": { borderColor: "var(--blue-bdr-tint)", background: "linear-gradient(180deg, var(--s1), var(--blue-tint))" },
              "var(--gold2)": { borderColor: "var(--gold2-bdr-tint)", background: "linear-gradient(180deg, var(--s1), var(--gold2-tint))" },
              "var(--accent)": { borderColor: "var(--accent-bdr-tint)", background: "linear-gradient(180deg, var(--s1), var(--accent-tint2))" }
            }[x.c] || {};
            return (
              <div 
                key={i} 
                className="sbox" 
                style={{ ...customStyle, cursor: "pointer" }}
                onClick={() => handleQuickFill(x.val)}
                title="คลิกเพื่อนำเลขนี้ไปกรอกช่องประเมิน"
              >
                <div style={{ fontSize: 12, color: x.c, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Icon size={10} style={{ color: x.c }} />
                  <span>{x.label}</span>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: x.c }}>{x.val}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
