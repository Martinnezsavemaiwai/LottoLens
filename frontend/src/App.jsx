import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import "./config/theme.css";
import { getStats, getLaoStats } from "./utils/mathEngine";
import { fetchLotteryHistory, fetchLotteryStats } from "./services/api";
import { fmtTH, mapBackendDraw, mapBackendLaoDraw } from "./utils/helpers";
import { HISTORY } from "./data/history";
import { LAO_HISTORY } from "./data/laoHistory";
import Loading from "./components/common/Loading";
import Skeleton from "./components/ui/Skeleton";
import LotterySwitcher from "./components/common/LotterySwitcher";
import { useLottery } from "./context/LotteryContext";
import { useTheme } from "./context/ThemeContext";
import Analytics from "./components/tabs/Analytics";
import Trends    from "./components/tabs/Trends";
import AIPredict from "./components/tabs/AIPredict";
import Tools     from "./components/tabs/Tools";
import HistTab   from "./components/tabs/HistTab";

import { BarChart3, TrendingUp, Bot, Dices, History, AlertTriangle, Sun, Moon } from "lucide-react";

const TABS = [
  { id:"analytics", label:"สถิติ", icon: BarChart3 },
  { id:"trends",    label:"แนวโน้ม", icon: TrendingUp },
  { id:"ai",        label:"AI คาดเดา", icon: Bot },
  { id:"tools",     label:"เครื่องมือ", icon: Dices },
  { id:"history",   label:"ประวัติ", icon: History },
];

export default function App() {
  const [tab, setTab] = useState("analytics");
  const { lotteryType } = useLottery();
  const { theme, toggleTheme } = useTheme();

  // 1. Fetch History (Draws) dynamically based on active lotteryType
  const { 
    data: historyData, 
    isLoading: histLoading, 
    isError: histError 
  } = useQuery({
    queryKey: ["draws", lotteryType],
    queryFn: () => fetchLotteryHistory(lotteryType, 1, 1000), // Get all for math engine
    select: (res) => (res.data || []).map(lotteryType === "lao" ? mapBackendLaoDraw : mapBackendDraw),
  });

  // 2. Fetch Stats Summary dynamically based on active lotteryType
  const { 
    data: backendStats, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ["stats", "summary", lotteryType],
    queryFn: () => fetchLotteryStats(lotteryType),
  });

  // Fallback to static datasets if API fails or backend is empty
  const history = useMemo(() => {
    if (historyData && historyData.length > 0) return historyData;
    return lotteryType === "lao" ? LAO_HISTORY : HISTORY;
  }, [historyData, lotteryType]);
  
  // 3. Client-side Math Engine (Hybrid/Polymorphic)
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    if (lotteryType === "lao") {
      const clientStats = getLaoStats(history);
      // Merge Go backend stats if available
      if (backendStats && backendStats.type === "lao" && backendStats.data) {
        const bs = backendStats.data;
        const mergedHot = bs.hot ? bs.hot.map(x => ({ d: x.digit, digit: x.digit, count: x.count, gap: x.gap })) : clientStats.hot;
        const mergedCold = bs.cold ? bs.cold.map(x => ({ d: x.digit, digit: x.digit, count: x.count, gap: x.gap })) : clientStats.cold;
        const mergedOverdue = bs.overdue ? bs.overdue.map(x => ({ d: x.digit, digit: x.digit, count: x.count, gap: x.gap })) : clientStats.overdue;

        return {
          ...clientStats,
          backend: bs,
          hot: mergedHot,
          cold: mergedCold,
          overdue: mergedOverdue,
          hotSet: new Set(mergedHot.map(h => h.d)),
          coldSet: new Set(mergedCold.map(c => c.d)),
          ...(bs.top_tail4 && { tail4Arr: bs.top_tail4 }),
          ...(bs.top_top2 && { top2Arr: bs.top_top2 }),
          ...(bs.top_bottom2 && { bottom2Arr: bs.top_bottom2 }),
          ...(bs.z_scores && { zScores: bs.z_scores }),
        };
      }
      return clientStats;
    } else {
      const clientStats = getStats(history);
      // Merge Go backend stats if available (Overriding client logic with Go logic)
      if (backendStats) {
        const bs = backendStats.data || backendStats;
        return {
          ...clientStats,
          backend: bs, // Keep for reference
          // Override specific fields if backend provides them
          ...(bs.top_frequency && { back2Arr: bs.top_frequency }),
        };
      }
      return clientStats;
    }
  }, [history, backendStats, lotteryType]);

  const last = history[0];

  const logoTitle = lotteryType === "lao" ? "LAO Lotto AI" : "THAI Lotto AI";
  const logoSub = lotteryType === "lao" ? "หวยลาวพัฒนา" : "สลากกินแบ่งรัฐบาล";

  // All 5 tabs available for both Thai and Lao modes
  const currentTabs = TABS;



  return (
    <div className={`app mode-${lotteryType}`}>
      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-in">
          <div className="logo-wrap">
            <div className="logo">{logoTitle}</div>
            <div className="logo-sub">{logoSub} · {histLoading ? "..." : history.length} งวด</div>
          </div>

          {/* Premium Glassmorphic Switcher */}
          <LotterySwitcher />


          <div className="hdr-prize" aria-label="ผลล่าสุด">
            {histLoading ? (
              // Header Skeleton Phase
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="prize-pill" style={{border: 'none', background: 'transparent', padding: 0}}>
                    <Skeleton width={80} height={42} />
                  </div>
                ))}
              </>
            ) : last ? (
              lotteryType === "lao" ? (
                // Lao Draw Header Display
                <>
                  <div className="prize-pill lao-prize-pill">
                    <div className="prize-lbl">งวด {fmtTH(last.dateTH || last.date)}</div>
                    <div className="prize-num first" style={{color:"var(--lao-accent2)"}}>{last.tail4}</div>
                  </div>
                  <div className="prize-pill lao-prize-pill">
                    <div className="prize-lbl">เลขท้าย 3 ตัว</div>
                    <div className="prize-num" style={{color:"var(--green)",fontSize:16}}>
                      {last.top3}
                    </div>
                  </div>
                  <div className="prize-pill lao-prize-pill">
                    <div className="prize-lbl">เลขท้าย 2 ตัว</div>
                    <div className="prize-num" style={{color:"var(--blue)",fontSize:16}}>
                      {last.top2}
                    </div>
                  </div>
                </>
              ) : (
                // Thai Draw Header Display
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
              )
            ) : (
              <div style={{fontSize:11,color:"var(--txt3)", opacity: 0.5}}>รอการ Sync ข้อมูล...</div>
            )}
          </div>

          <nav className="tabs" aria-label="เมนูหลัก">
            {currentTabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  className={`tab${tab===t.id?" on":""}`}
                  onClick={() => setTab(t.id)}
                  aria-current={tab===t.id?"page":undefined}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Icon size={12} className="sv" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Theme Toggle Button */}
          <button 
            className="theme-btn" 
            onClick={toggleTheme} 
            aria-label={theme === "light" ? "เปลี่ยนเป็น Dark Mode" : "เปลี่ยนเป็น Light Mode"}
            style={{
              background: "var(--s2)",
              border: "1px solid var(--bdr2)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--txt2)",
              transition: "all 0.2s",
              flexShrink: 0
            }}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="wrap">
        <div className="disc" role="note" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Reality Check:</strong> ผลการออกรางวัลเป็น Randomness อย่างแท้จริง ไม่มีระบบใดทำนายได้ 100%
            ระบบนี้ใช้ Data Science วิเคราะห์ Statistical Pattern จากข้อมูลจริง {history.length} งวด เพื่อประกอบการตัดสินใจเท่านั้น
            <strong> กรุณาบริหารความเสี่ยงอย่างมีสติ</strong>
          </div>
        </div>

        {(!history || history.length === 0) && tab !== 'history' ? (
          <div className="card mt" style={{background:"var(--s1)",border:"1px solid rgba(201,149,42,0.2)",padding:28,textAlign:"center", display: "flex", flexDirection: "column", alignItems: "center"}}>
            <History size={40} style={{ color: "var(--accent2)", marginBottom: 16 }} />
            <h3 style={{color:"var(--accent2)",marginBottom:8}}>ยังไม่มีข้อมูลหวยในระบบ</h3>
            <p style={{fontSize:13,color:"var(--txt3)",marginBottom:20}}>กรุณาไปที่เมนู "ประวัติ" เพื่อทำการประมวลผลข้อมูล</p>
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
