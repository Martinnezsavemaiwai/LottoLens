import { useState, useEffect } from "react";
import { callGemini } from "../../services/gemini";
import { parseJson } from "../../utils/helpers";
import { Sparkles, Dices, Flame, Gift, Moon, Target, BarChart3, Clock, AlertTriangle, HelpCircle, Snowflake, Award, Search, HelpCircle as HelpIcon } from "lucide-react";
import { useLottery } from "../../context/LotteryContext";

/**
 * Tab: Tools — Smart Pick, Dream interpreter, AI Scorer
 * Supports both Thai and Lao modes
 * @param {{ stats: Object, history: Array }} props
 */
export default function Tools({ stats, history }) {
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

  const MODES = [
    { id: "random",   l: "สุ่ม",     icon: HelpIcon },
    { id: "hot",      l: "Hot",      icon: Flame    },
    { id: "birthday", l: "วันเกิด",  icon: Gift     },
    { id: "dream",    l: "ฝัน",      icon: Moon     }
  ];

  const evalColor = evalData
    ? (evalData.score >= 7 ? "var(--green)" : evalData.score >= 5 ? "var(--gold)" : "var(--red)")
    : "var(--txt3)";

  // Quick reference data — Lao vs Thai
  const quickRefData = isLao ? [
    { label: "Hot digits",     val: stats.hot.map(h=>h.d).join(" · "),                          c: "var(--red)",    icon: Flame   },
    { label: "Cold digits",    val: stats.cold.map(c=>c.d).join(" · "),                         c: "var(--blue)",   icon: Snowflake},
    { label: "Top 4 ตัวท้าย", val: (stats.tail4Arr||[]).slice(0,3).map(c=>c.n).join(" · "),    c: "var(--accent)", icon: Award   },
    { label: "Top เลขท้าย 2 ตัว",   val: (stats.top2Arr||[]).slice(0,3).map(c=>c.n).join(" · "),     c: "var(--blue)",   icon: Target  },
  ] : [
    { label: "Hot digits",  val: stats.hot.map(h=>h.d).join(" · "),                              c: "var(--red)",    icon: Flame   },
    { label: "Cold digits", val: stats.cold.map(c=>c.d).join(" · "),                             c: "var(--blue)",   icon: Snowflake},
    { label: "2ล่าง Top3",  val: stats.combo.slice(0,3).map(c=>c.n).join(" · "),                c: "var(--gold2)",  icon: Award   },
    { label: "3ล่าง Top3",  val: (stats.back3Arr||[]).slice(0,3).map(c=>c.n).join(" · "),       c: "var(--blue)",   icon: Target  },
  ];

  return (
    <div className="fade">
      <div className="grid-res grid-cols-1 lg:grid-cols-2 mt">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Smart Pick */}
          <div className="card">
            <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Dices size={16} style={{ color: "var(--accent)" }} />
              <span>Smart Pick</span>
              {isLao && <span className="csub">หวยลาวพัฒนา</span>}
            </div>
            <div className="fchips" style={{marginBottom:10}}>
              {MODES.map(m => {
                const IconComponent = m.icon;
                return (
                  <button key={m.id} className={`fchip${mode===m.id?" on":""}`} onClick={()=>setMode(m.id)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <IconComponent size={12} />
                    <span>{m.l}</span>
                  </button>
                );
              })}
            </div>
            <div className="fchips" style={{marginBottom:12}}>
              <span style={{fontSize:10,color:"var(--txt3)",alignSelf:"center"}}>ประเภท:</span>
              {PRIZE_TYPES.map(([k,l])=>(
                <button key={k} className={`fchip${prizeType===k?" on":""}`} onClick={()=>setPrizeType(k)}>{l}</button>
              ))}
            </div>

            {mode==="birthday" && (
              <div style={{marginBottom:10}}>
                <label className="lbl">วันเกิด (คริสต์ศักราช)</label>
                <input type="date" className="inp" value={dob} onChange={e=>setDob(e.target.value)}/>
              </div>
            )}
            {mode==="dream" && (
              <div style={{marginBottom:10}}>
                <label className="lbl">สิ่งที่ฝัน</label>
                <input id="inp-dream" className="inp" placeholder="เช่น งู เสือ ทอง น้ำท่วม..." value={dream} onChange={e=>setDream(e.target.value)}/>
              </div>
            )}

            {mode!=="dream" && (
              <>
                <div className="tgl" onClick={()=>setExCold(!exCold)}>
                  <span style={{fontSize:12}}>ตัดเลขดับ (Cold: {stats.cold.map(c=>c.d).join(",")})</span>
                  <div className={`tgl-track${exCold?" on":""}`}><div className="tgl-thumb"/></div>
                </div>
                <div className="tgl" onClick={()=>setExDbl(!exDbl)}>
                  <span style={{fontSize:12}}>ตัดเลขเบิ้ล (00,11,22...)</span>
                  <div className={`tgl-track${exDbl?" on":""}`}><div className="tgl-thumb"/></div>
                </div>
              </>
            )}

            <button id="btn-generate" className="btn btn-g btn-full" style={{marginTop:8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px"}}
              onClick={mode==="dream"?handleDream:handleGenerate}
              disabled={loading==="dream"}>
              {loading==="dream" ? (
                <>
                  <Moon size={14} className="spin" />
                  <span>ตีความฝัน...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>สร้างเลข</span>
                </>
              )}
            </button>
          </div>

          {/* Evaluator */}
          <div className="card">
            <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <BarChart3 size={16} style={{ color: "var(--accent)" }} />
              <span>AI Scorer (ประเมินชุดเลข)</span>
            </div>
            <div className="fchips" style={{marginBottom:10}}>
              {PRIZE_TYPES.map(([k,l])=>(
                <button key={k} className={`fchip${prizeType===k?" on":""}`} onClick={()=>setPrizeType(k)}>{l}</button>
              ))}
            </div>
            <label className="lbl">ชุดเลขที่ต้องการประเมิน</label>
            <input id="inp-eval" className="inp" style={{marginBottom:8}}
              placeholder={`พิมพ์ ${digits} หลัก เช่น ${digits===2?"09":digits===3?"591":digits===4?"1234":"123456"}`}
              value={evalNum} onChange={e=>setEvalNum(e.target.value.replace(/\D/g,"").slice(0,digits))}/>
            <button id="btn-eval" className="btn btn-b btn-full" onClick={handleEval} disabled={loading==="eval"||!evalNum.trim()}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {loading==="eval" ? (
                <>
                  <Sparkles size={14} className="spin" />
                  <span>ประเมิน...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>ประเมินด้วย AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result panel */}
        <div className="card" style={{minHeight:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          {rightContent==="idle" && (
            <div style={{textAlign:"center",color:"var(--txt3)"}}>
              <div style={{display: "flex", justifyContent: "center", marginBottom: 12}}>
                <Dices size={48} style={{ color: "var(--accent3)" }} />
              </div>
              <p style={{fontSize:13}}>กดสร้างเลข หรือประเมินชุดเลขด้านซ้าย</p>
            </div>
          )}

          {rightContent==="gen" && (
            <div className="fade" style={{width:"100%",textAlign:"center"}}>
              {generated ? (
                <>
                  <div style={{fontSize:10,color:"var(--txt3)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>ผลลัพธ์</div>
                  <div className="nbig">{generated}</div>
                  <div className="nsubs">
                    {generated.length>=4&&<span>4 ตัว: <strong>{generated.slice(-4)}</strong></span>}
                    {generated.length>=3&&<span>3 ตัว: <strong>{generated.slice(-3)}</strong></span>}
                    <span>2 ตัว: <strong>{generated.slice(-2)}</strong></span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <AlertTriangle size={48} style={{ color: "var(--red)" }} />
                </div>
              )}
              {dreamNote && (
                <div style={{marginTop:14,background:"var(--s2)",borderRadius:10,padding:12,fontSize:13,lineHeight:1.7,textAlign:"left", display: "flex", gap: "8px", alignItems: "flex-start"}}>
                  {generated ? (
                    <Moon size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                  ) : (
                    <AlertTriangle size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: "2px" }} />
                  )}
                  <div>{dreamNote}</div>
                </div>
              )}
              {generated && genHistory.length>1 && (
                <div style={{marginTop:16}}>
                  <div style={{fontSize:10,color:"var(--txt3)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>ประวัติที่สร้าง</div>
                  <div className="chips" style={{justifyContent:"center"}}>
                    {genHistory.slice(1,6).map((n,i)=>(
                      <span key={i} className="chip" style={{opacity:1-i*0.15}}>
                        <span className="chip-num" style={{fontSize:12}}>{n}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {rightContent==="eval" && (
            <div className="fade" style={{width:"100%",textAlign:"center"}}>
              {loading==="eval" ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                    <Sparkles size={28} className="spin" style={{ color: "var(--accent)" }} />
                  </div>
                  <div style={{fontSize:13,color:"var(--txt3)"}}>ประเมิน "{evalNum}"...</div>
                </div>
              ) : evalData && (
                <>
                  {evalData.score > 0 ? (
                    <>
                      <div style={{fontSize:52,fontFamily:"Chakra Petch,sans-serif",fontWeight:900,color:evalColor}}>
                        {evalData.score}<span style={{fontSize:22,color:"var(--txt3)"}}>/ 10</span>
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:evalColor,marginBottom:12}}>{evalData.verdict}</div>
                    </>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <AlertTriangle size={48} style={{ color: "var(--red)" }} />
                    </div>
                  )}
                  <div style={{background:"var(--s2)",borderRadius:10,padding:14,fontSize:13,lineHeight:1.75,textAlign:"left", display: "flex", gap: "8px", alignItems: "flex-start"}}>
                    {evalData.score === 0 && <AlertTriangle size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: "2px" }} />}
                    <div>{evalData.reason}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick reference */}
      <div className="card">
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Award size={14} style={{ color: "var(--accent)" }} />
          <span>ข้อมูลอ้างอิงสำหรับเลือกเลข</span>
          {isLao && <span className="csub">หวยลาวพัฒนา</span>}
        </div>
        <div className="grid-res grid-cols-2 lg:grid-cols-4" style={{gap:10}}>
          {quickRefData.map((x,i)=>{
            const Icon = x.icon;
            // Mode-aware visual colors to break identical cards pattern
            const cardStyles = {
              "var(--red)": { borderColor: "rgba(239, 68, 68, 0.25)", background: "linear-gradient(180deg, var(--s2), rgba(239, 68, 68, 0.03))" },
              "var(--blue)": { borderColor: "rgba(59, 130, 246, 0.25)", background: "linear-gradient(180deg, var(--s2), rgba(59, 130, 246, 0.02))" },
              "var(--gold2)": { borderColor: "rgba(240, 180, 41, 0.3)", background: "linear-gradient(180deg, var(--s2), rgba(240, 180, 41, 0.04))" },
              "var(--accent)": { borderColor: isLao ? "rgba(167, 139, 250, 0.3)" : "rgba(201, 149, 42, 0.3)", background: `linear-gradient(180deg, var(--s2), ${isLao ? 'rgba(167, 139, 250, 0.04)' : 'rgba(201, 149, 42, 0.04)'})` }
            };
            const customStyle = cardStyles[x.c] || {};
            return (
              <div key={i} className="sbox" style={customStyle}>
                <div style={{fontSize:10,color:x.c,letterSpacing:1,textTransform:"uppercase",marginBottom:6, display: "inline-flex", alignItems: "center", gap: "4px"}}>
                  <Icon size={10} style={{ color: x.c }} />
                  <span>{x.label}</span>
                </div>
                <div style={{fontFamily:"Chakra Petch,sans-serif",fontSize:18,color:x.c}}>{x.val}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
