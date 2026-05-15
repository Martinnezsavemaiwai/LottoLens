import { useState } from "react";
import { callGemini } from "../../services/gemini";
import { parseJson } from "../../utils/helpers";

/**
 * Tab: Tools — Smart Pick, Dream interpreter, AI Scorer
 * @param {{ stats: Object, history: Array }} props
 */
export default function Tools({ stats, history }) {
  const [mode, setMode]               = useState("random");
  const [prizeType, setPrizeType]     = useState("back2");
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

  const digits = prizeType==="back2"?2:prizeType==="first"?6:3;

  function pickRandom(len) {
    let pool = [0,1,2,3,4,5,6,7,8,9];
    if (exCold) pool = pool.filter(d => !stats.coldSet.has(d));
    if (mode==="hot") pool = [...stats.hot.map(h=>h.d)];
    if (!pool.length) pool = [0,1,2,3,4,5,6,7,8,9];
    let num, tries = 0;
    do {
      tries++;
      num = Array.from({length:len}, () => pool[Math.floor(Math.random()*pool.length)]).join("");
      if (exDbl && num.length>=2 && num[num.length-1]===num[num.length-2]) num=null;
    } while (!num && tries<5000);
    return num || String(Math.floor(Math.random()*Math.pow(10,len))).padStart(len,"0");
  }

  function handleGenerate() {
    let num;
    if (mode==="birthday" && dob) {
      const parts = dob.replace(/-/g,"");
      const pool = [...new Set(parts.split(""))];
      while (pool.length<digits) pool.push(String(Math.floor(Math.random()*10)));
      num = pool.slice(0,digits).sort(()=>Math.random()-.5).join("");
    } else { num = pickRandom(digits); }
    setGenerated(num);
    setGenHistory(h => [num,...h.slice(0,8)]);
    setDreamNote(""); setEvalData(null); setRightContent("gen");
  }

  async function handleDream() {
    if (!dream.trim()) return;
    setLoading("dream"); setDreamNote("");
    const prompt = `ตีความฝันและหาเลขมงคลหวยไทย: "${dream}" ตอบ JSON: {"meaning":"ความหมายของฝัน","lucky2":"เลข2หลัก","lucky3":"เลข3หลัก","reason":"เหตุผลสั้นๆ"}`;
    try {
      const text = await callGemini(prompt, "ตอบ JSON เท่านั้น");
      const p = parseJson(text);
      if (p) {
        setDreamNote(`✨ ${p.meaning}${p.reason?` — ${p.reason}`:""}`);
        setGenerated(prizeType==="back2"?p.lucky2:p.lucky3||p.lucky2||"??");
        setGenHistory(h => [p.lucky2,...h.slice(0,8)].filter(Boolean));
        setRightContent("gen");
      }
    } catch { setDreamNote("ไม่สามารถวิเคราะห์ได้"); }
    setLoading("");
  }

  async function handleEval() {
    if (!evalNum.trim()) return;
    setLoading("eval"); setEvalData(null);
    const prizeLabel = prizeType==="back2"?"เลขท้าย 2 ตัว":prizeType==="back3"?"เลขท้าย 3 ตัว":prizeType==="front3"?"เลขหน้า 3 ตัว":"รางวัลที่ 1";
    const combo3 = stats.combo.slice(0,3).map(c=>c.n).join(",");
    const prompt = `ประเมินชุดเลข "${evalNum}" สำหรับหวยรัฐบาลไทย ${prizeLabel}
สถิติ: Combo2ล่างTop3=${combo3}, Hot=${stats.hot.map(h=>h.d).join(",")}, Cold=${stats.cold.map(c=>c.d).join(",")}
Top2ล่าง=${stats.back2Arr.slice(0,3).map(x=>x.n).join(",")}, Top3ล่าง=${stats.back3Arr.slice(0,3).map(x=>x.n).join(",")}
ตอบ JSON: {"score":คะแนน1-10,"verdict":"ดีมาก/ดี/ปานกลาง/อ่อน","reason":"2-3 ประโยคภาษาไทย อ้างอิงสถิติ"}`;
    try {
      const text = await callGemini(prompt, "ตอบ JSON เท่านั้น");
      setEvalData(parseJson(text)||{score:5,verdict:"ปานกลาง",reason:"ไม่สามารถประเมินได้"});
    } catch { setEvalData({score:5,verdict:"ปานกลาง",reason:"เกิดข้อผิดพลาด"}); }
    setLoading(""); setRightContent("eval");
  }

  const MODES = [{id:"random",l:"🎲 สุ่ม"},{id:"hot",l:"🔥 Hot"},{id:"birthday",l:"🎂 วันเกิด"},{id:"dream",l:"🌙 ฝัน"}];
  const evalColor = evalData?(evalData.score>=7?"var(--green)":evalData.score>=5?"var(--gold)":"var(--red)"):"var(--txt3)";

  return (
    <div className="fade">
      <div className="g2 mt">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Smart Pick */}
          <div className="card">
            <div className="ctitle">🎰 Smart Pick</div>
            <div className="fchips" style={{marginBottom:10}}>
              {MODES.map(m=><button key={m.id} className={`fchip${mode===m.id?" on":""}`} onClick={()=>setMode(m.id)}>{m.l}</button>)}
            </div>
            <div className="fchips" style={{marginBottom:12}}>
              <span style={{fontSize:10,color:"var(--txt3)",alignSelf:"center"}}>ประเภท:</span>
              {[["back2","เลขท้าย 2 ตัว"],["back3","เลขท้าย 3 ตัว"],["front3","เลขหน้า 3 ตัว"],["first","รางวัลที่ 1"]].map(([k,l])=>(
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

            <button id="btn-generate" className="btn btn-g btn-full" style={{marginTop:8}}
              onClick={mode==="dream"?handleDream:handleGenerate}
              disabled={loading==="dream"}>
              {loading==="dream"?<><span className="spin">🌙</span> ตีความฝัน...</>:"✨ สร้างเลข"}
            </button>
          </div>

          {/* Evaluator */}
          <div className="card">
            <div className="ctitle">📊 AI Scorer — ประเมินชุดเลข</div>
            <div className="fchips" style={{marginBottom:10}}>
              {[["back2","เลขท้าย 2 ตัว"],["back3","เลขท้าย 3 ตัว"],["front3","เลขหน้า 3 ตัว"]].map(([k,l])=>(
                <button key={k} className={`fchip${prizeType===k?" on":""}`} onClick={()=>setPrizeType(k)}>{l}</button>
              ))}
            </div>
            <label className="lbl">ชุดเลขที่ต้องการประเมิน</label>
            <input id="inp-eval" className="inp" style={{marginBottom:8}}
              placeholder={`พิมพ์ ${digits} หลัก เช่น ${digits===2?"09":digits===3?"591":"123456"}`}
              value={evalNum} onChange={e=>setEvalNum(e.target.value.replace(/\D/g,"").slice(0,digits))}/>
            <button id="btn-eval" className="btn btn-b btn-full" onClick={handleEval} disabled={loading==="eval"||!evalNum.trim()}>
              {loading==="eval"?<><span className="spin">⚙️</span> ประเมิน...</>:"🔍 ประเมินด้วย AI"}
            </button>
          </div>
        </div>

        {/* Result panel */}
        <div className="card" style={{minHeight:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          {rightContent==="idle" && (
            <div style={{textAlign:"center",color:"var(--txt3)"}}>
              <div style={{fontSize:48,marginBottom:12}}>🎰</div>
              <p style={{fontSize:13}}>กดสร้างเลข หรือประเมินชุดเลขด้านซ้าย</p>
            </div>
          )}

          {rightContent==="gen" && generated && (
            <div className="fade" style={{width:"100%",textAlign:"center"}}>
              <div style={{fontSize:9,color:"var(--txt3)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>ผลลัพธ์</div>
              <div className="nbig">{generated}</div>
              <div className="nsubs">
                {generated.length>=3&&<span>3 ตัว: <strong>{generated.slice(-3)}</strong></span>}
                <span>2 ตัว: <strong>{generated.slice(-2)}</strong></span>
              </div>
              {dreamNote && (
                <div style={{marginTop:14,background:"var(--s2)",borderRadius:10,padding:12,fontSize:13,lineHeight:1.7,textAlign:"left"}}>
                  {dreamNote}
                </div>
              )}
              {genHistory.length>1 && (
                <div style={{marginTop:16}}>
                  <div style={{fontSize:9,color:"var(--txt3)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>ประวัติที่สร้าง</div>
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
              {loading==="eval"
                ? <div><span className="spin" style={{fontSize:28}}>⚙️</span><div style={{fontSize:13,color:"var(--txt3)",marginTop:10}}>ประเมิน "{evalNum}"...</div></div>
                : evalData && (
                  <>
                    <div style={{fontSize:52,fontFamily:"Chakra Petch,sans-serif",fontWeight:900,color:evalColor}}>
                      {evalData.score}<span style={{fontSize:22,color:"var(--txt3)"}}>/ 10</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:evalColor,marginBottom:12}}>{evalData.verdict}</div>
                    <div style={{background:"var(--s2)",borderRadius:10,padding:14,fontSize:13,lineHeight:1.75,textAlign:"left"}}>{evalData.reason}</div>
                  </>
                )
              }
            </div>
          )}
        </div>
      </div>

      {/* Quick reference */}
      <div className="card">
        <div className="ctitle">📌 ข้อมูลอ้างอิงสำหรับเลือกเลข</div>
        <div className="g4" style={{gap:10}}>
          {[
            {label:"🔥 Hot digits",val:stats.hot.map(h=>h.d).join(" · "),c:"var(--red)"},
            {label:"🧊 Cold digits",val:stats.cold.map(c=>c.d).join(" · "),c:"var(--blue)"},
            {label:"🏆 2ล่าง Top3",val:stats.combo.slice(0,3).map(c=>c.n).join(" · "),c:"var(--gold2)"},
            {label:"🔵 3ล่าง Top3",val:stats.back3Arr.slice(0,3).map(c=>c.n).join(" · "),c:"var(--blue)"},
          ].map((x,i)=>(
            <div key={i} className="sbox">
              <div style={{fontSize:9,color:x.c,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{x.label}</div>
              <div style={{fontFamily:"Chakra Petch,sans-serif",fontSize:18,color:x.c}}>{x.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
