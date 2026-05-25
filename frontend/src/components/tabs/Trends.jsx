import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fmtTH, CTip } from "../../utils/helpers";
import { useLottery } from "../../context/LotteryContext";
import { BarChart3, TrendingUp, Award, Clock, Shield } from "lucide-react";

/**
 * Tab: Trends — Distribution chart, ติดตามรายตัวเลข, Combo Score, Timeline
 * @param {{ stats: Object, history: Array }} props
 */
export default function Trends({ stats, history }) {
  const { lotteryType } = useLottery();
  const [sel, setSel] = useState("7");
  const [prizeView, setPrizeView] = useState("back2");

  // Sync default prizeView when lotteryType switches
  useEffect(() => {
    setPrizeView(lotteryType === "lao" ? "tail4" : "back2");
  }, [lotteryType]);

  const distData = [...stats.digArr].sort((a,b) => a.d-b.d).map(x => ({label:String(x.d),count:x.count}));

  const trendData = history.slice(0,20).reverse().map(row => {
    let seq = "";
    if (lotteryType === "lao") {
      if (prizeView==="tail4")   seq = row.tail4 || "";
      if (prizeView==="top3")    seq = row.top3 || "";
      if (prizeView==="top2")    seq = row.top2 || "";
      if (prizeView==="bottom2") seq = row.bottom2 || "";
    } else {
      if (prizeView==="back2")  seq = row.back2 || "";
      if (prizeView==="back3")  seq = (row.back3 && row.back3[0]) || "";
      if (prizeView==="front3") seq = (row.front3 && row.front3[0]) || "";
      if (prizeView==="first")  seq = row.first || "";
    }
    const dateStr = row.dateISO || row.date || "";
    return { date: fmtTH(dateStr).slice(0,7), count: seq.split("").filter(d=>d===sel).length };
  });

  return (
    <div className="fade">
      <div className="card mt">
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <BarChart3 size={16} style={{ color: "var(--accent)" }} />
          <span>Distribution — ความถี่ตัวเลข 0-9</span>
        </div>
        <div style={{height:200}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData} margin={{top:0,right:0,left:-22,bottom:0}}>
              <XAxis dataKey="label" tick={{fill:"#4a5170",fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#4a5170",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CTip/>}/>
              <Bar dataKey="count" name="ครั้ง" radius={[5,5,0,0]}>
                {distData.map(item => {
                  const n = Number(item.label);
                  const color = stats.hotSet.has(n)?"#ef5350":stats.coldSet.has(n)?"var(--blue)":"var(--gold)";
                  return <Cell key={item.label} fill={color}/>;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="fchips mt" style={{fontSize:10,gap:10, display: "inline-flex", alignItems: "center"}}>
          <span style={{color:"#ef5350", display: "inline-flex", alignItems: "center", gap: "4px"}}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#ef5350" }} /> Hot
          </span>
          <span style={{color:"var(--gold)", display: "inline-flex", alignItems: "center", gap: "4px"}}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} /> Normal
          </span>
          <span style={{color:"var(--blue)", display: "inline-flex", alignItems: "center", gap: "4px"}}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} /> Cold
          </span>
        </div>
      </div>

      <div className="card">
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <TrendingUp size={16} style={{ color: "var(--accent)" }} />
          <span>ติดตามรายตัวเลข (20 งวดล่าสุด)</span>
        </div>
        <div className="fchips" style={{marginBottom:10}}>
          {lotteryType === "lao" ? (
            [["tail4","เลขท้าย 4 ตัว"],["top3","เลข 3 ตัวบน"],["top2","เลข 2 ตัวบน"],["bottom2","เลข 2 ตัวล่าง"]].map(([k,l])=>(
              <button key={k} className={`fchip${prizeView===k?" on":""}`} onClick={()=>setPrizeView(k)}>{l}</button>
            ))
          ) : (
            [["back2","เลขท้าย 2 ตัว"],["back3","เลขท้าย 3 ตัว"],["front3","เลขหน้า 3 ตัว"],["first","รางวัลที่ 1"]].map(([k,l])=>(
              <button key={k} className={`fchip${prizeView===k?" on":""}`} onClick={()=>setPrizeView(k)}>{l}</button>
            ))
          )}
        </div>
        <div className="fchips" style={{marginBottom:14}}>
          {[0,1,2,3,4,5,6,7,8,9].map(n=>(
            <button key={n} className={`fchip${String(n)===sel?" on":""}`} onClick={()=>setSel(String(n))}>{n}</button>
          ))}
        </div>
        <div style={{height:180}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{top:0,right:10,left:-22,bottom:0}}>
              <XAxis dataKey="date" tick={{fill:"#4a5170",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{fill:"#4a5170",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CTip/>}/>
              <Line dataKey="count" name={`เลข ${sel}`} stroke="var(--gold2)" strokeWidth={2}
                dot={{fill:"var(--gold2)",r:3}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Award size={16} style={{ color: "var(--accent)" }} />
          <span>Combo Score — เลขท้าย {lotteryType === "lao" ? "2 ตัวล่าง" : "2 ตัว"}</span>
          <span className="csub">= ความถี่(40%) + ระยะห่าง(30%) + โมเมนตัม(30%)</span>
        </div>
        <div className="chips">
          {stats.combo.slice(0,20).map((c,i)=>(
            <span key={c.n} className={`chip${i<3?" top":""}`}>
              <span className="chip-num">{c.n}</span><span className="chip-cnt">{c.s}pt</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Clock size={16} style={{ color: "var(--accent)" }} />
          <span>ไทม์ไลน์ผล (40 งวดล่าสุด)</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            {lotteryType === "lao" ? (
              <>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>งวด</th>
                    <th>4 ตัวท้าย</th>
                    <th>3 ตัวบน</th>
                    <th>2 ตัวบน</th>
                    <th>2 ตัวล่าง</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0,40).map((row,i)=>(
                    <tr key={i}>
                      <td style={{color:"var(--txt3)"}}>{i+1}</td>
                      <td style={{color:"var(--txt3)",fontSize:11}}>{fmtTH(row.dateISO || row.date)}</td>
                      <td style={{fontFamily:"Cinzel,serif",fontSize:16,color:"var(--lao-accent2)",letterSpacing:2,fontWeight:700}}>{row.tail4}</td>
                      <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:13,color:"var(--green)",letterSpacing:1}}>{row.top3}</td>
                      <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:13,color:"var(--blue)",letterSpacing:1}}>{row.top2}</td>
                      <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:13,color:"var(--red)",letterSpacing:1}}>{row.bottom2}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>#</th><th>งวด</th>
                    <th>รางวัลที่ 1</th>
                    <th>เลขหน้า 3 ตัว</th>
                    <th>เลขท้าย 3 ตัว</th>
                    <th>เลขท้าย 2 ตัว</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0,40).map((row,i)=>(
                    <tr key={i}>
                      <td style={{color:"var(--txt3)"}}>{i+1}</td>
                      <td style={{color:"var(--txt3)",fontSize:11}}>{fmtTH(row.dateTH)}</td>
                      <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:13,color:"var(--gold3)",letterSpacing:2}}>{row.first}</td>
                      <td style={{color:"var(--green)",fontFamily:"Chakra Petch,sans-serif",fontSize:12}}>
                        {(row.front3 || []).join(" / ")}
                      </td>
                      <td style={{color:"var(--blue)",fontFamily:"Chakra Petch,sans-serif",fontSize:12}}>
                        {(row.back3 || []).join(" / ")}
                      </td>
                      <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:14,color:"var(--red)",fontWeight:700,letterSpacing:3}}>
                        {row.back2}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
