import { useState, useMemo } from "react";
import { DBall } from "../../utils/helpers";
import { useQuery } from "@tanstack/react-query";
import { fetchFrequencyStats, fetchPositionalStats } from "../../services/api";
import Skeleton from "../ui/Skeleton";

/**
 * Tab: Analytics — สถิติ Positional, Hot/Cold, Pattern งวด 1 vs 16
 * @param {{ stats: Object, history: Array }} props
 */
export default function Analytics({ stats: localStats, history }) {
  const [posMode, setPosMode] = useState("back2");

  // Fetch Positional Stats from Go API
  const { data: positionalData, isLoading: isPosLoading } = useQuery({
    queryKey: ["stats", "positional", posMode],
    queryFn: () => fetchPositionalStats(posMode),
    select: (res) => res.data,
  });

  // Fetch Top 20 Frequency for the current mode
  const { data: freqData, isLoading: isFreqLoading } = useQuery({
    queryKey: ["stats", "frequency", posMode],
    queryFn: () => fetchFrequencyStats(posMode, 20),
    select: (res) => res.data,
  });

  const posLabels = {
    back2:  ["หลักสิบ","หลักหน่วย"],
    back3:  ["หลักร้อย","หลักสิบ","หลักหน่วย"],
    front3: ["หลักร้อย","หลักสิบ","หลักหน่วย"],
    first:  ["ล้าน","แสน","หมื่น","พัน","ร้อย","สิบ"],
  };

  // Map backend format to UI format for Positional Analysis
  const mappedPosFreq = useMemo(() => {
    if (!positionalData) return null;
    // UI expects array of arrays [ [counts for digit 0-9], [counts for digit 0-9]... ]
    const mapToArr = (items) => {
      const arr = new Array(10).fill(0);
      items.forEach(item => arr[item.digit] = item.count);
      return arr;
    };
    return [
      mapToArr(positionalData.pos1 || []),
      mapToArr(positionalData.pos2 || []),
      mapToArr(positionalData.pos3 || []),
      mapToArr(positionalData.pos4 || []),
      mapToArr(positionalData.pos5 || []),
      mapToArr(positionalData.pos6 || []),
    ];
  }, [positionalData]);

  // Use local stats as fallback while loading or for missing features
  const stats = localStats; 

  return (
    <div className="fade">
      {/* Overview */}
      <div className="grid-res grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt">
        <div className="sbox">
          <div className="sv">{stats ? history.length : <Skeleton width={60} height={28} className="mx-auto" />}</div>
          <div className="sl">งวดทั้งหมด</div>
        </div>
        <div className="sbox">
          <div className="sv" style={{color:"var(--red)",fontSize:18}}>
            {stats ? stats.hot.map(h=>h.d).join(" · ") : <Skeleton width={100} height={24} className="mx-auto" />}
          </div>
          <div className="sl">🔥 Hot Digits</div>
        </div>
        <div className="sbox">
          <div className="sv" style={{color:"var(--blue)",fontSize:18}}>
            {stats ? stats.cold.map(c=>c.d).join(" · ") : <Skeleton width={100} height={24} className="mx-auto" />}
          </div>
          <div className="sl">🧊 Cold Digits</div>
        </div>
        <div className="sbox">
          <div className="sv" style={{fontSize:18}}>
            {stats ? stats.combo.slice(0,3).map(c=>c.n).join(" · ") : <Skeleton width={120} height={24} className="mx-auto" />}
          </div>
          <div className="sl">🏆 Top เลขท้าย 2 ตัว</div>
        </div>
      </div>

      {/* Positional Analysis */}
      <div className="card mt">
        <div className="ctitle">🎯 Positional Frequency Analysis
          <span className="csub">ตัวเลขที่ออกบ่อยสุดในแต่ละหลัก</span>
        </div>
        <div className="fchips" style={{marginBottom:14}}>
          {[["back2","เลขท้าย 2 ตัว"],["back3","เลขท้าย 3 ตัว"],["front3","เลขหน้า 3 ตัว"],["first","รางวัลที่ 1"]].map(([k,l])=>(
            <button key={k} className={`fchip${posMode===k?" on":""}`} onClick={()=>setPosMode(k)}>{l}</button>
          ))}
        </div>
        <div className="pos-grid" style={{gridTemplateColumns:`repeat(${posLabels[posMode].length},1fr)`, position: 'relative', minHeight: 120}}>
          {isPosLoading ? (
             <div style={{gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'inherit', gap: 10, width: '100%'}}>
               {posLabels[posMode].map((_, i) => (
                 <div key={i} className="pos-cell" style={{border: 'none', background: 'transparent'}}>
                   <Skeleton height={80} />
                 </div>
               ))}
             </div>
          ) : mappedPosFreq ? (
            posLabels[posMode].map((label, i) => {
              const arr = mappedPosFreq[i];
              const mx = Math.max(...arr);
              const topNums = arr.map((c,n) => c===mx?n:-1).filter(n=>n!==-1);
              return (
                <div key={i} className="pos-cell">
                  <div className="pos-lbl">{label}</div>
                  <div>{topNums.map(n=><span key={n} className="pos-dig">{n}</span>)}</div>
                  <div className="pos-cnt">ออก {mx} ครั้ง</div>
                </div>
              );
            })
          ) : (
            <div style={{gridColumn: '1/-1', textAlign: 'center', padding: 40}}>❌ ไม่สามารถโหลดข้อมูลได้</div>
          )}
        </div>
      </div>

      {/* Hot / Cold / Overdue */}
      <div className="grid-res grid-cols-1 md:grid-cols-3">
        <div className="card">
          <div className="ctitle">🔥 Hot Digits <span className="csub">ออกบ่อยที่สุด</span></div>
          <div className="dballs">
            {stats ? stats.hot.map(h=><DBall key={h.d} d={h.d} cls="hot" count={h.count}/>) : <Skeleton height={52} width="100%" />}
          </div>
        </div>
        <div className="card">
          <div className="ctitle">🧊 Cold Digits <span className="csub">ออกน้อยที่สุด</span></div>
          <div className="dballs">
            {stats ? stats.cold.map(c=><DBall key={c.d} d={c.d} cls="cold" count={c.count}/>) : <Skeleton height={52} width="100%" />}
          </div>
        </div>
        <div className="card">
          <div className="ctitle">⏳ Overdue <span className="csub">ทิ้งช่วงนานสุด</span></div>
          <div className="dballs">
            {stats ? stats.overdue.map(o=><DBall key={o.d} d={o.d} cls="over" count={o.count} label={o.gap>=999?"ไม่ปรากฏ":`${o.gap}งวด`}/>) : <Skeleton height={52} width="100%" />}
          </div>
        </div>
      </div>

      {/* Structural Stats */}
      <div className="card">
        <div className="ctitle">📊 โครงสร้างความน่าจะเป็น (Structural Statistics)</div>
        <div className="grid-res grid-cols-1 lg:grid-cols-2">
          <div>
            {stats ? (
              [
                [stats.deep.evenPct,"เลขคู่","var(--blue)",stats.deep.oddPct,"เลขคี่","var(--red)"],
                [stats.deep.loPct,"เลขต่ำ 0-4","var(--green)",stats.deep.hiPct,"เลขสูง 5-9","var(--gold)"],
              ].map(([v1,l1,c1,v2,l2,c2],i)=>(
                <div className="pbar" key={i}>
                  <div className="pbar-lbrow">
                    <span style={{color:c1}}>{l1} {v1}%</span>
                    <span style={{color:c2}}>{l2} {v2}%</span>
                  </div>
                  <div className="pbar-track">
                    <div className="pbar-fill" style={{width:`${v1}%`,background:c1}}/>
                    <div className="pbar-fill" style={{width:`${v2}%`,background:c2}}/>
                  </div>
                </div>
              ))
            ) : (
              <Skeleton height={80} className="mb" />
            )}
            {stats && (
              <div className="pbar">
                <div className="pbar-lbrow">
                  <span style={{color:"var(--purple)"}}>โอกาสเลขเบิ้ล เลขท้าย 2 ตัว (00,11,...)</span>
                  <span style={{color:"var(--txt)",fontWeight:600}}>{stats.deep.dbl2Pct}%</span>
                </div>
                <div className="pbar-track">
                  <div className="pbar-fill" style={{width:`${stats.deep.dbl2Pct}%`,background:"var(--purple)"}}/>
                </div>
              </div>
            )}
          </div>
          <div style={{fontSize:12,color:"var(--txt3)",lineHeight:1.9,padding:"4px 0"}}>
            {stats ? (
              <>
                <div>📌 ฐานข้อมูล {history.length} งวด (หวยไทย)</div>
                <div>📌 เลขคู่{stats.deep.evenPct>50?"ออกบ่อยกว่า":"ออกน้อยกว่า"}เลขคี่</div>
                <div>📌 เลขต่ำ{stats.deep.loPct>50?"ออกบ่อยกว่า":"ออกน้อยกว่า"}เลขสูง</div>
                <div>📌 เลขเบิ้ล เลขท้าย 2 ตัวมีโอกาส <strong style={{color:"var(--purple)"}}>{stats.deep.dbl2Pct}%</strong></div>
              </>
            ) : (
              <Skeleton height={60} />
            )}
          </div>
        </div>
      </div>

      {/* Day Pattern */}
      <div className="card">
        <div className="ctitle">📅 Pattern งวดวันที่ 1 vs 16
          <span className="csub">เลขท้าย 2 ตัวที่ออกบ่อยแยกตามวันออกรางวัล</span>
        </div>
        <div className="grid-res grid-cols-1 lg:grid-cols-2">
          <div>
            <div style={{fontSize:10,color:"var(--gold)",marginBottom:8,letterSpacing:1}}>📌 งวดวันที่ 1</div>
            <div className="chips">
              {stats ? Object.entries(stats.day1Freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,c],i)=>(
                <span key={n} className={`chip${i<3?" top":""}`}>
                  <span className="chip-num">{n}</span><span className="chip-cnt">×{c}</span>
                </span>
              )) : <Skeleton height={32} width="100%" />}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--cyan)",marginBottom:8,letterSpacing:1}}>📌 งวดวันที่ 16</div>
            <div className="chips">
              {stats ? Object.entries(stats.day16Freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,c],i)=>(
                <span key={n} className={`chip${i<3?" top":""}`} style={i<3?{borderColor:"var(--cyan)"}:{}}>
                  <span className="chip-num" style={i<3?{color:"var(--cyan)"}:{}}>{n}</span>
                  <span className="chip-cnt">×{c}</span>
                </span>
              )) : <Skeleton height={32} width="100%" />}
            </div>
          </div>
        </div>
      </div>

      {/* Mode-specific Hot Pairs / Numbers from API */}
      <div className="card">
        <div className="ctitle">🔗 {posLabels[posMode].join("")} — ความถี่สะสม (Top 20)
          <span className={`pb-${posMode} prize-badge`}>{posLabels[posMode].join("")}</span>
        </div>
        <div className="chips">
          {isFreqLoading ? (
            <div style={{display: 'flex', gap: 8, width: '100%'}}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} width={60} height={32} />)}
            </div>
          ) : freqData?.map((p, i) => (
            <span key={p.number} className={`chip${i < 3 ? " top" : ""}`}>
              <span className="chip-num">{p.number}</span><span className="chip-cnt">×{p.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Static Historical Stats (Keep for now as fallback/comparison) */}
      <div className="card" style={{opacity: 0.6}}>
        <div className="ctitle">📚 สถิติย้อนหลัง (Local Engine)
          <span className="csub">ข้อมูลจากไฟล์ local {history.length} งวด</span>
        </div>
        <div className="chips">
          {stats.back2Arr.slice(0, 10).map((p, i) => (
            <span key={p.n} className="chip">
              <span className="chip-num">{p.n}</span><span className="chip-cnt">×{p.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Back3 + Front3 */}
      <div className="grid-res grid-cols-1 lg:grid-cols-2">
        <div className="card">
          <div className="ctitle">🔗 เลขท้าย 3 ตัว — Top 12 <span className="pb-back3 prize-badge">เลขท้าย 3 ตัว</span></div>
          <div className="chips">
            {stats ? stats.back3Arr.slice(0,12).map((p,i)=>(
              <span key={p.n+i} className={`chip${i<3?" top":""}`}>
                <span className="chip-num">{p.n}</span><span className="chip-cnt">×{p.count}</span>
              </span>
            )) : <Skeleton height={32} width="100%" />}
          </div>
        </div>
        <div className="card">
          <div className="ctitle">🔗 เลขหน้า 3 ตัว — Top 12 <span className="pb-front3 prize-badge">เลขหน้า 3 ตัว</span></div>
          <div className="chips">
            {stats ? stats.front3Arr.slice(0,12).map((p,i)=>(
              <span key={p.n+i} className={`chip${i<3?" top":""}`} style={i<3?{borderColor:"var(--green)"}:{}}>
                <span className="chip-num" style={i<3?{color:"#66bb6a"}:{}}>{p.n}</span>
                <span className="chip-cnt">×{p.count}</span>
              </span>
            )) : <Skeleton height={32} width="100%" />}
          </div>
        </div>
      </div>

      {/* Gap per digit */}
      <div className="card">
        <div className="ctitle">⏱️ ระยะห่างตัวเลข 0-9 (กี่งวดที่แล้ว)</div>
        {stats.digArr.map(({d, gap}) => {
          const pct   = Math.min(100,(gap/30)*100);
          const color = gap>20?"var(--red)":gap>10?"var(--gold)":"var(--green)";
          return (
            <div key={d} className="orow">
              <div className="onum">{d}</div>
              <div className="otrack"><div className="ofill" style={{width:`${pct}%`,background:color}}/></div>
              <div className="oago">{gap>=999?"ไม่ปรากฏ":gap===0?"งวดนี้":`${gap} งวดก่อน`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
