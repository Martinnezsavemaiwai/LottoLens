import { useState, useMemo, useEffect } from "react";
import { DBall } from "../../utils/helpers";
import { useQuery } from "@tanstack/react-query";
import { fetchFrequencyStats, fetchPositionalStats } from "../../services/api";
import { useLottery } from "../../context/LotteryContext";
import Skeleton from "../ui/Skeleton";
import { BarChart3, Target, Flame, Snowflake, Clock, Award, BookOpen, AlertTriangle, Check, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Tab: Analytics — สถิติ Positional, Hot/Cold, Pattern งวด 1 vs 16
 * @param {{ stats: Object, history: Array }} props
 */
export default function Analytics({ stats: localStats, history }) {
  const { lotteryType } = useLottery();
  const [posMode, setPosMode] = useState("back2");

  // Sync default posMode when lotteryType changes
  useEffect(() => {
    setPosMode(lotteryType === "lao" ? "tail4" : "back2");
  }, [lotteryType]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset pagination on mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [posMode, lotteryType]);

  // Fetch Positional Stats from Go API (Only active for Thai lottery)
  const { data: positionalData, isLoading: isPosLoading } = useQuery({
    queryKey: ["stats", "positional", posMode],
    queryFn: () => fetchPositionalStats(posMode),
    select: (res) => res.data,
    enabled: lotteryType === "thai",
  });

  // Fetch Frequency for the current mode (Only active for Thai lottery)
  const { data: freqData, isLoading: isFreqLoading } = useQuery({
    queryKey: ["stats", "frequency", posMode],
    queryFn: () => fetchFrequencyStats(posMode, 1000),
    select: (res) => res.data,
    enabled: lotteryType === "thai",
  });

  const posLabels = {
    // Thai Labels
    back2: ["หลักสิบ", "หลักหน่วย"],
    back3: ["หลักร้อย", "หลักสิบ", "หลักหน่วย"],
    front3: ["หลักร้อย", "หลักสิบ", "หลักหน่วย"],
    first: ["ล้าน", "แสน", "หมื่น", "พัน", "ร้อย", "สิบ"],
    // Lao Labels
    tail4: ["หลักพัน", "หลักร้อย", "หลักสิบ", "หลักหน่วย"],
    top3: ["หลักร้อย", "หลักสิบ", "หลักหน่วย"],
    top2: ["หลักสิบ", "หลักหน่วย"],
  };

  // Map backend format to UI format for Positional Analysis (Thai API vs Lao client-side)
  const mappedPosFreq = useMemo(() => {
    if (lotteryType === "lao") {
      if (!localStats) return null;
      if (posMode === "tail4") return localStats.tail4PosFreq;
      if (posMode === "top3") return localStats.top3PosFreq;
      if (posMode === "top2") return localStats.top2PosFreq;
      if (posMode === "bottom2") return localStats.bot2PosFreq;
      return localStats.tail4PosFreq;
    } else {
      if (!positionalData) return null;
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
    }
  }, [positionalData, localStats, posMode, lotteryType]);

  // Map Frequency data based on lotteryType (Thai API vs Lao local client-side mathEngine)
  const freqList = useMemo(() => {
    if (lotteryType === "lao") {
      if (!localStats) return [];
      if (posMode === "tail4") return (localStats.tail4Arr || []).map(x => ({ number: x.n, count: x.count }));
      if (posMode === "top2") return (localStats.top2Arr || []).map(x => ({ number: x.n, count: x.count }));
      if (posMode === "bottom2") return (localStats.bottom2Arr || []).map(x => ({ number: x.n, count: x.count }));
      return [];
    } else {
      return freqData || [];
    }
  }, [freqData, localStats, posMode, lotteryType]);

  // Paginated list based on Current Page
  const paginatedFreqList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return (freqList || []).slice(startIndex, startIndex + itemsPerPage);
  }, [freqList, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((freqList || []).length / itemsPerPage));
  }, [freqList, itemsPerPage]);

  const stats = localStats;

  const currentChips = useMemo(() => {
    if (lotteryType === "lao") {
      return [
        ["tail4", "4 ตัวท้าย"],
        ["top3", "3 ตัวบน"],
        ["top2", "2 ตัวบน"],
      ];
    } else {
      return [
        ["back2", "เลขท้าย 2 ตัว"],
        ["back3", "เลขท้าย 3 ตัว"],
        ["front3", "เลขหน้า 3 ตัว"],
        ["first", "รางวัลที่ 1"],
      ];
    }
  }, [lotteryType]);

  return (
    <div className="fade">
      {/* Overview */}
      <div className="grid-res grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt">
        <div className="sbox">
          <div className="sv">{stats ? history.length : <Skeleton width={60} height={28} className="mx-auto" />}</div>
          <div className="sl">งวดทั้งหมด</div>
        </div>
        <div className="sbox">
          <div className="sv" style={{ color: "var(--accent)", fontSize: 18 }}>
            {stats ? stats.hot.map(h => h.d).join(" · ") : <Skeleton width={100} height={24} className="mx-auto" />}
          </div>
          <div className="sl" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Flame size={12} style={{ color: "var(--accent)" }} />
            <span>Hot Digits</span>
          </div>
        </div>
        <div className="sbox">
          <div className="sv" style={{ color: "var(--blue)", fontSize: 18 }}>
            {stats ? stats.cold.map(c => c.d).join(" · ") : <Skeleton width={100} height={24} className="mx-auto" />}
          </div>
          <div className="sl" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Snowflake size={12} style={{ color: "var(--blue)" }} />
            <span>Cold Digits</span>
          </div>
        </div>
        <div className="sbox">
          <div className="sv" style={{ fontSize: 18 }}>
            {stats ? stats.combo.slice(0, 3).map(c => c.n).join(" · ") : <Skeleton width={120} height={24} className="mx-auto" />}
          </div>
          <div className="sl" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Award size={12} style={{ color: "var(--gold)" }} />
            <span>Top เลขเด่นที่ออกบ่อย</span>
          </div>
        </div>
      </div>

      {/* Positional Analysis */}
      <div className="card mt">
        <div className="ctitle" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Target size={14} style={{ color: "var(--accent)" }} />
          <span>Positional Frequency Analysis</span>
          <span className="csub">ตัวเลขที่ออกบ่อยสุดในแต่ละหลัก</span>
        </div>
        <div className="fchips" style={{ marginBottom: 14 }}>
          {currentChips.map(([k, l]) => (
            <button key={k} className={`fchip${posMode === k ? " on" : ""}`} onClick={() => setPosMode(k)}>{l}</button>
          ))}
        </div>
        <div className="pos-grid" style={{ gridTemplateColumns: `repeat(${posLabels[posMode]?.length || 2},1fr)`, position: 'relative', minHeight: 120 }}>
          {isPosLoading && lotteryType === "thai" ? (
            <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'inherit', gap: 10, width: '100%' }}>
              {posLabels[posMode]?.map((_, i) => (
                <div key={i} className="pos-cell" style={{ border: 'none', background: 'transparent' }}>
                  <Skeleton height={80} />
                </div>
              ))}
            </div>
          ) : mappedPosFreq ? (
            posLabels[posMode]?.map((label, i) => {
              const arr = mappedPosFreq[i];
              const mx = Math.max(...(arr || [0]));
              const topNums = (arr || []).map((c, n) => c === mx ? n : -1).filter(n => n !== -1);
              return (
                <div key={i} className="pos-cell">
                  <div className="pos-lbl">{label}</div>
                  <div>{topNums.map(n => <span key={n} className="pos-dig">{n}</span>)}</div>
                  <div className="pos-cnt">ออก {mx} ครั้ง</div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--red)" }}>
              <AlertTriangle size={32} />
              <span>ไม่สามารถโหลดข้อมูลสถิติได้</span>
            </div>
          )}
        </div>
      </div>

      {/* Hot / Cold / Overdue */}
      <div className="grid-res grid-cols-1 md:grid-cols-3">
        <div className="card">
          <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Flame size={14} style={{ color: "var(--accent)" }} />
            <span>Hot Digits</span>
            <span className="csub">ออกบ่อยที่สุด</span>
          </div>
          <div className="dballs">
            {stats ? stats.hot.map(h => <DBall key={h.d} d={h.d} cls="hot" count={h.count} />) : <Skeleton height={52} width="100%" />}
          </div>
        </div>
        <div className="card">
          <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Snowflake size={14} style={{ color: "var(--blue)" }} />
            <span>Cold Digits</span>
            <span className="csub">ออกน้อยที่สุด</span>
          </div>
          <div className="dballs">
            {stats ? stats.cold.map(c => <DBall key={c.d} d={c.d} cls="cold" count={c.count} />) : <Skeleton height={52} width="100%" />}
          </div>
        </div>
        <div className="card">
          <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Clock size={14} style={{ color: "var(--accent)" }} />
            <span>Overdue</span>
            <span className="csub">ทิ้งช่วงนานสุด</span>
          </div>
          <div className="dballs">
            {stats ? stats.overdue.map(o => <DBall key={o.d} d={o.d} cls="over" count={o.count} label={o.gap >= 999 ? "ไม่ปรากฏ" : `${o.gap}งวด`} />) : <Skeleton height={52} width="100%" />}
          </div>
        </div>
      </div>

      {/* Structural Stats */}
      <div className="card">
        <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <BarChart3 size={14} style={{ color: "var(--accent)" }} />
          <span>โครงสร้างความน่าจะเป็น (Structural Statistics)</span>
        </div>
        <div className="grid-res grid-cols-1 lg:grid-cols-2">
          <div>
            {stats ? (
              [
                [stats.deep.evenPct, "เลขคู่", "var(--blue)", stats.deep.oddPct, "เลขคี่", "var(--red)"],
                [stats.deep.loPct, "เลขต่ำ 0-4", "var(--green)", stats.deep.hiPct, "เลขสูง 5-9", "var(--accent)"],
              ].map(([v1, l1, c1, v2, l2, c2], i) => (
                <div className="pbar" key={i}>
                  <div className="pbar-lbrow">
                    <span style={{ color: c1 }}>{l1} {v1}%</span>
                    <span style={{ color: c2 }}>{l2} {v2}%</span>
                  </div>
                  <div className="pbar-track">
                    <div className="pbar-fill" style={{ width: `${v1}%`, background: c1 }} />
                    <div className="pbar-fill" style={{ width: `${v2}%`, background: c2 }} />
                  </div>
                </div>
              ))
            ) : (
              <Skeleton height={80} className="mb" />
            )}
            {stats && (
              <div className="pbar">
                <div className="pbar-lbrow">
                  <span style={{ color: "var(--purple)" }}>
                    {lotteryType === "lao" ? "โอกาสเลขเบิ้ล 2 ตัวล่าง (00,11,...)" : "โอกาสเลขเบิ้ล เลขท้าย 2 ตัว (00,11,...)"}
                  </span>
                  <span style={{ color: "var(--txt)", fontWeight: 600 }}>{stats.deep.dbl2Pct}%</span>
                </div>
                <div className="pbar-track">
                  <div className="pbar-fill" style={{ width: `${stats.deep.dbl2Pct}%`, background: "var(--purple)" }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--txt2)", lineHeight: 1.9, padding: "4px 0" }}>
            {stats ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={12} style={{ color: "var(--accent)" }} />
                  <span>ฐานข้อมูล {history.length} งวด ({lotteryType === "lao" ? "หวยลาวพัฒนา" : "หวยไทย"})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={12} style={{ color: "var(--accent)" }} />
                  <span>เลขคู่{stats.deep.evenPct > 50 ? "ออกบ่อยกว่า" : "ออกน้อยกว่า"}เลขคี่</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={12} style={{ color: "var(--accent)" }} />
                  <span>เลขต่ำ{stats.deep.loPct > 50 ? "ออกบ่อยกว่า" : "ออกน้อยกว่า"}เลขสูง</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={12} style={{ color: "var(--accent)" }} />
                  <span>เลขเบิ้ล{lotteryType === "lao" ? " 2 ตัวล่าง" : " เลขท้าย 2 ตัว"}มีโอกาส <strong style={{ color: "var(--purple)" }}>{stats.deep.dbl2Pct}%</strong></span>
                </div>
              </>
            ) : (
              <Skeleton height={60} />
            )}
          </div>
        </div>
      </div>

      {/* Day Pattern — Only shown in Thai Lottery Mode */}
      {lotteryType === "thai" && stats && (
        <div className="card">
          <div className="ctitle">📅 Pattern งวดวันที่ 1 vs 16
            <span className="csub">เลขท้าย 2 ตัวที่ออกบ่อยแยกตามวันออกรางวัล</span>
          </div>
          <div className="grid-res grid-cols-1 lg:grid-cols-2">
            <div>
              <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 8, letterSpacing: 1 }}>📌 งวดวันที่ 1</div>
              <div className="chips">
                {stats.day1Freq ? Object.entries(stats.day1Freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c], i) => (
                  <span key={n} className={`chip${i < 3 ? " top" : ""}`}>
                    <span className="chip-num">{n}</span><span className="chip-cnt">×{c}</span>
                  </span>
                )) : <Skeleton height={32} width="100%" />}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--cyan)", marginBottom: 8, letterSpacing: 1 }}>📌 งวดวันที่ 16</div>
              <div className="chips">
                {stats.day16Freq ? Object.entries(stats.day16Freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c], i) => (
                  <span key={n} className={`chip${i < 3 ? " top" : ""}`} style={i < 3 ? { borderColor: "var(--cyan)" } : {}}>
                    <span className="chip-num" style={i < 3 ? { color: "var(--cyan)" } : {}}>{n}</span>
                    <span className="chip-cnt">×{c}</span>
                  </span>
                )) : <Skeleton height={32} width="100%" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode-specific Frequency from API or local client */}
      {posLabels[posMode] && (
        <div className="card">
          <div className="ctitle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={16} style={{ color: "var(--accent)" }} />
              <span>ความถี่สะสมของรางวัล {posLabels[posMode].join("")}</span>
              <span className={`pb-${posMode} prize-badge`}>{posLabels[posMode].join("")}</span>
            </div>
          </div>

          <div className="chips" style={{ minHeight: "60px", marginTop: "12px" }}>
            {isFreqLoading && lotteryType === "thai" ? (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} width={60} height={32} />)}
              </div>
            ) : paginatedFreqList.length > 0 ? (
              paginatedFreqList.map((p) => {
                // Determine global rank to preserve Top 3 yellow highlight
                const globalIndex = freqList.findIndex(item => item.number === p.number);
                const isTop = globalIndex >= 0 && globalIndex < 3;
                return (
                  <span key={p.number} className={`chip${isTop ? " top" : ""}`}>
                    <span className="chip-num">{p.number}</span><span className="chip-cnt">×{p.count}</span>
                  </span>
                );
              })
            ) : (
              <div style={{ fontSize: 11, color: "var(--txt3)", padding: 10, width: "100%", textAlign: "center" }}>ไม่พบข้อมูลความถี่สะสม</div>
            )}
          </div>

          {/* Interactive Pagination Bar */}
          {freqList.length > itemsPerPage && (
            <div style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              paddingTop: 12
            }}>
              <span style={{ fontSize: 11, color: "var(--txt3)" }}>
                แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, freqList.length)} จาก {freqList.length} รายการ
              </span>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  className="fchip"
                  disabled={currentPage === 1}
                  style={{
                    height: "auto",
                    padding: "6px 12px",
                    fontSize: 11,
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? "default" : "pointer",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={12} />
                  <span>ย้อนกลับ</span>
                </button>
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 11,
                  color: "var(--txt2)",
                  padding: "0 8px"
                }}>
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  className="fchip"
                  disabled={currentPage === totalPages}
                  style={{
                    height: "auto",
                    padding: "6px 12px",
                    fontSize: 11,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? "default" : "pointer",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <span>ถัดไป</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thai-specific Fallback Tables */}
      {lotteryType === "thai" && stats && (
        <>
          <div className="card" style={{ opacity: 0.6 }}>
            <div className="ctitle">📚 สถิติย้อนหลัง (Local Engine)
              <span className="csub">ข้อมูลจากไฟล์ local {history.length} งวด</span>
            </div>
            <div className="chips">
              {stats.back2Arr?.slice(0, 10).map((p, i) => (
                <span key={p.n} className="chip">
                  <span className="chip-num">{p.n}</span><span className="chip-cnt">×{p.count}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid-res grid-cols-1 lg:grid-cols-2">
            <div className="card">
              <div className="ctitle">🔗 เลขท้าย 3 ตัว — Top 12 <span className="pb-back3 prize-badge">เลขท้าย 3 ตัว</span></div>
              <div className="chips">
                {stats.back3Arr ? stats.back3Arr.slice(0, 12).map((p, i) => (
                  <span key={p.n + i} className={`chip${i < 3 ? " top" : ""}`}>
                    <span className="chip-num">{p.n}</span><span className="chip-cnt">×{p.count}</span>
                  </span>
                )) : <Skeleton height={32} width="100%" />}
              </div>
            </div>
            <div className="card">
              <div className="ctitle">🔗 เลขหน้า 3 ตัว — Top 12 <span className="pb-front3 prize-badge">เลขหน้า 3 ตัว</span></div>
              <div className="chips">
                {stats.front3Arr ? stats.front3Arr.slice(0, 12).map((p, i) => (
                  <span key={p.n + i} className={`chip${i < 3 ? " top" : ""}`} style={i < 3 ? { borderColor: "var(--green)" } : {}}>
                    <span className="chip-num" style={i < 3 ? { color: "#66bb6a" } : {}}>{p.n}</span>
                    <span className="chip-cnt">×{p.count}</span>
                  </span>
                )) : <Skeleton height={32} width="100%" />}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Gap per digit */}
      {stats && (
        <div className="card">
          <div className="ctitle" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Clock size={14} style={{ color: "var(--accent)" }} />
            <span>ระยะห่างตัวเลข 0-9 (กี่งวดที่แล้ว)</span>
          </div>
          {stats.digArr?.map(({ d, gap }) => {
            const pct = Math.min(100, (gap / 30) * 100);
            const color = gap > 20 ? "var(--red)" : gap > 10 ? "var(--gold)" : "var(--green)";
            return (
              <div key={d} className="orow">
                <div className="onum">{d}</div>
                <div className="otrack"><div className="ofill" style={{ width: `${pct}%`, background: color }} /></div>
                <div className="oago">{gap >= 999 ? "ไม่ปรากฏ" : gap === 0 ? "งวดนี้" : `${gap} งวดก่อน`}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
