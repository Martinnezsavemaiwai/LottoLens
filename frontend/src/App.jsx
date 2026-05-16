import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import "./config/theme.css";
import { getStats } from "./utils/mathEngine";
import { fetchDraws, fetchStatsSummary } from "./services/api";
import { fmtTH, mapBackendDraw } from "./utils/helpers";
import Loading from "./components/common/Loading";
import Skeleton from "./components/ui/Skeleton";
import Analytics from "./components/tabs/Analytics";
import Trends    from "./components/tabs/Trends";
import AIPredict from "./components/tabs/AIPredict";
import Tools     from "./components/tabs/Tools";
import HistTab   from "./components/tabs/HistTab";

const TABS = [
  { id:"analytics", label:"📊 สถิติ" },
  { id:"trends",    label:"📈 แนวโน้ม" },
  { id:"ai",        label:"🤖 AI คาดเดา" },
  { id:"tools",     label:"🎰 เครื่องมือ" },
  { id:"history",   label:"📋 ประวัติ" },
];

export default function App() {
  const [tab, setTab] = useState("analytics");

  // 1. Fetch History (Draws)
  const { 
    data: historyData, 
    isLoading: histLoading, 
    isError: histError 
  } = useQuery({
    queryKey: ["draws"],
    queryFn: () => fetchDraws(1, 1000), // Get all for math engine
    select: (res) => (res.data || []).map(mapBackendDraw),
  });

  // 2. Fetch Stats Summary (Backend Logic)
  const { 
    data: backendStats, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: fetchStatsSummary,
  });

  const history = historyData || [];
  
  // 3. Client-side Math Engine (Hybrid)
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const clientStats = getStats(history);
    
    // Merge backend stats if available (Overriding client logic with Go logic)
    if (backendStats) {
      return {
        ...clientStats,
        backend: backendStats, // Keep for reference
        // Override specific fields if backend provides them
        ...(backendStats.top_frequency && { back2Arr: backendStats.top_frequency }),
      };
    }
    return clientStats;
  }, [history, backendStats]);

  const last = history[0];

  // Removed full-screen Loading return to prevent CLS
  if (histError) return <div className="app"><div className="card mt error">❌ ไม่สามารถดึงข้อมูลจาก API ได้ กรุณาตรวจสอบ Backend</div></div>;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-in">
          <div className="logo-wrap">
            <div className="logo">🏆 ThaiLotto AI</div>
            <div className="logo-sub">สลากกินแบ่งรัฐบาล · {histLoading ? "..." : history.length} งวด</div>
          </div>

          <div className="hdr-prize" aria-label="ผลล่าสุด">
            {histLoading ? (
              // Header Skeleton Phase
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="prize-pill" style={{border: 'none', background: 'transparent', padding: 0}}>
                    <Skeleton width={i === 1 ? 100 : 80} height={42} />
                  </div>
                ))}
              </>
            ) : last ? (
              <>
                <div className="prize-pill">
                  <div className="prize-lbl">งวด {fmtTH(last.dateTH)}</div>
                  <div className="prize-num first">{last.first}</div>
                </div>
                <div className="prize-pill">
                  <div className="prize-lbl">เลขหน้า 3 ตัว</div>
                  <div className="prize-num" style={{color:"var(--green)",fontSize:13}}>
                    {last.front3.join(" / ")}
                  </div>
                </div>
                <div className="prize-pill">
                  <div className="prize-lbl">เลขท้าย 3 ตัว</div>
                  <div className="prize-num" style={{color:"var(--blue)",fontSize:13}}>
                    {last.back3.join(" / ")}
                  </div>
                </div>
                <div className="prize-pill">
                  <div className="prize-lbl">เลขท้าย 2 ตัว</div>
                  <div className="prize-num" style={{color:"var(--red)",fontSize:20,letterSpacing:5}}>
                    {last.back2}
                  </div>
                </div>
              </>
            ) : (
              <div style={{fontSize:11,color:"var(--txt3)", opacity: 0.5}}>รอการ Sync ข้อมูล...</div>
            )}
          </div>

          <nav className="tabs" aria-label="เมนูหลัก">
            {TABS.map(t => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                className={`tab${tab===t.id?" on":""}`}
                onClick={() => setTab(t.id)}
                aria-current={tab===t.id?"page":undefined}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="wrap">
        <div className="disc" role="note">
          🎲 <strong>Reality Check:</strong> ผลสลากกินแบ่งรัฐบาลเป็น Randomness อย่างแท้จริง ไม่มีระบบใดทำนายได้ 100%
          ระบบนี้ใช้ Data Science วิเคราะห์ Statistical Pattern จากข้อมูลจริง {history.length} งวด เพื่อประกอบการตัดสินใจเท่านั้น
          <strong> กรุณาบริหารความเสี่ยงอย่างมีสติ</strong>
        </div>

        {(!history || history.length === 0) && tab !== 'history' ? (
          <div className="card mt" style={{background:"var(--s1)",border:"1px solid rgba(201,149,42,0.2)",padding:28,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:16}}>📝</div>
            <h3 style={{color:"var(--gold2)",marginBottom:8}}>ยังไม่มีข้อมูลหวยในระบบ</h3>
            <p style={{fontSize:13,color:"var(--txt3)",marginBottom:20}}>กรุณาไปที่เมนู "ประวัติ" เพื่อทำการ Sync ข้อมูลจาก Sanook</p>
            <button className="btn btn-g" onClick={()=>setTab('history')}>ไปที่หน้าประวัติ</button>
          </div>
        ) : (
          <>
            {tab==="analytics" && <Analytics stats={stats} history={history}/>}
            {tab==="trends"    && <Trends    stats={stats} history={history}/>}
            {tab==="ai"        && <AIPredict history={history} stats={stats}/>}
            {tab==="tools"     && <Tools     stats={stats} history={history}/>}
            {tab==="history"   && <HistTab   history={history} />}
          </>
        )}
      </main>
    </div>
  );
}
