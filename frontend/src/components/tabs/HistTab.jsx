import { useState, useMemo, useEffect } from "react";
import { fmtTH } from "../../utils/helpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncDraws, postLotteryResult } from "../../services/api";
import { useLottery } from "../../context/LotteryContext";
import { Plus, RefreshCw, Loader2, Save, Ruler, ClipboardList, ChevronLeft, ChevronRight, Search } from "lucide-react";

/**
 * Tab: HistTab — เพิ่มผลหวยงวดใหม่ + แสดงตาราง history ทั้งหมด
 * @param {{ history: Array }} props
 */
export default function HistTab({ history }) {
  const { lotteryType } = useLottery();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm("");
  }, [lotteryType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const query = searchTerm.trim().toLowerCase();

    return history.filter(row => {
      if (lotteryType === "lao") {
        return (
          (row.tail4 && row.tail4.includes(query)) ||
          (row.top3 && row.top3.includes(query)) ||
          (row.top2 && row.top2.includes(query)) ||
          (row.year && row.year.toString().includes(query)) ||
          (row.date && row.date.toLowerCase().includes(query)) ||
          (row.dateTH && row.dateTH.toLowerCase().includes(query))
        );
      } else {
        const front3Str = (row.front3 || []).join("");
        const back3Str = (row.back3 || []).join("");
        return (
          (row.first && row.first.includes(query)) ||
          (row.back2 && row.back2.includes(query)) ||
          front3Str.includes(query) ||
          back3Str.includes(query) ||
          (row.year && row.year.toString().includes(query)) ||
          (row.dateTH && row.dateTH.toLowerCase().includes(query))
        );
      }
    });
  }, [history, searchTerm, lotteryType]);

  const totalPages = useMemo(() => Math.ceil(filteredHistory.length / itemsPerPage), [filteredHistory, itemsPerPage]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  const [newDate, setNewDate]   = useState("");
  const [newFirst, setNewFirst] = useState(""); // Lao: 6-digit draw number, Thai: First prize

  // Thai sub-fields (kept for Thai form backward compatibility)
  const [newFront3a, setNewFront3a] = useState("");
  const [newFront3b, setNewFront3b] = useState("");
  const [newBack3a, setNewBack3a]   = useState("");
  const [newBack3b, setNewBack3b]   = useState("");
  const [newBack2, setNewBack2]     = useState("");

  // Sync Mutation for Thai Lottery
  const syncMutation = useMutation({
    mutationFn: syncDraws,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draws", "thai"] });
      queryClient.invalidateQueries({ queryKey: ["stats", "summary", "thai"] });
      alert("ดึงข้อมูลล่าสุดเรียบร้อยแล้ว!");
    },
    onError: (err) => {
      alert("ดึงข้อมูลล้มเหลว: " + (err.response?.data?.details || err.message));
    }
  });

  // Post Mutation for manual entry (Lao/Thai)
  const addMutation = useMutation({
    mutationFn: (payload) => postLotteryResult(lotteryType, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draws", lotteryType] });
      queryClient.invalidateQueries({ queryKey: ["stats", "summary", lotteryType] });
      setNewDate("");
      setNewFirst("");
      setNewBack2("");
      alert("บันทึกผลรางวัลเรียบร้อยแล้ว!");
    },
    onError: (err) => {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + (err.response?.data?.details || err.message));
    }
  });

  // Real-time derivation of Lao segments as the user types the 6-digit number
  const derivedLao = useMemo(() => {
    if (lotteryType !== "lao" || newFirst.length !== 6) return null;
    return {
      tail4:   newFirst.slice(2),
      top3:    newFirst.slice(3),
      top2:    newFirst.slice(4),
      bottom2: newFirst.slice(2, 4),
    };
  }, [newFirst, lotteryType]);

  function handleSave() {
    if (!newDate || !newFirst) return;

    if (lotteryType === "lao") {
      if (newFirst.length !== 6) {
        alert("กรุณากรอกผลรางวัลให้ครบ 6 หลัก");
        return;
      }
      addMutation.mutate({
        date: newDate,
        full: newFirst,
        verified: true
      });
    } else {
      // Thai manual insert (fallback alert)
      alert("ขออภัย: ในระบบสลากกินแบ่งรัฐบาลกรุณาใช้ระบบ Sync อัตโนมัติเท่านั้น เพื่อความถูกต้องของฐานข้อมูล");
    }
  }

  const isLaoValid = lotteryType === "lao" && newDate && newFirst.length === 6;
  const isThaiValid = lotteryType === "thai" && newDate && newFirst.length === 6 && newBack2.length === 2;

  return (
    <div className="fade">
      {/* ── Add Result Card ── */}
      <div className="card mt">
        <div className="ctitle" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} style={{ color: "var(--accent)" }} />
            <span>เพิ่มผลหวย{lotteryType === "lao" ? "ลาวพัฒนา" : "รัฐบาลไทย"}งวดใหม่</span>
          </div>
          {lotteryType === "thai" && (
            <button 
              className="btn btn-b" 
              style={{fontSize: 11, padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px'}}
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 size={12} className="spin" />
                  <span>กำลัง Sync...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  <span>อัปเดตผลสลากกินแบ่งรัฐบาล</span>
                </>
              )}
            </button>
          )}
        </div>

        {lotteryType === "lao" ? (
          // Lao polymorphic manual form
          <div>
            <div className="grid-res grid-cols-1 md:grid-cols-2" style={{marginBottom:12}}>
              <div>
                <label className="lbl">วันที่ออกรางวัล (ค.ศ.)</label>
                <input type="date" className="inp" value={newDate} onChange={e=>setNewDate(e.target.value)}/>
              </div>
              <div>
                <label className="lbl">ผลรางวัลเลข 6 หลัก</label>
                <input 
                  id="inp-lao-full" 
                  className="inp font-cinzel" 
                  maxLength={6} 
                  placeholder="807095"
                  style={{fontSize: 16, letterSpacing: 2}}
                  value={newFirst} 
                  onChange={e=>setNewFirst(e.target.value.replace(/\D/g,""))}
                />
              </div>
            </div>

            {/* Derived segments live display */}
            {derivedLao && (
              <div style={{background:"var(--s2)", borderRadius:10, padding:14, border:"1px solid var(--lao-bdr2)", marginBottom:16}}>
                <div style={{fontSize:9, color:"var(--lao-accent2)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:8, display:"inline-flex", alignItems:"center", gap:"6px"}}>
                  <Ruler size={12} style={{ color: "var(--lao-accent2)" }} />
                  <span>คำนวณชุดรางวัลย่อยอัตโนมัติ (Derived segments)</span>
                </div>
                <div style={{display:"flex", gap:14, flexWrap:"wrap"}}>
                  <div style={{flex:1, minWidth:70}}>
                    <div style={{fontSize:9, color:"var(--txt3)"}}>4 ตัวท้าย</div>
                    <div style={{fontFamily:"Chakra Petch,sans-serif", fontSize:18, color:"var(--lao-accent3)"}}>{derivedLao.tail4}</div>
                  </div>
                  <div style={{flex:1, minWidth:70}}>
                    <div style={{fontSize:9, color:"var(--txt3)"}}>3 ตัวบน</div>
                    <div style={{fontFamily:"Chakra Petch,sans-serif", fontSize:18, color:"var(--green)"}}>{derivedLao.top3}</div>
                  </div>
                  <div style={{flex:1, minWidth:70}}>
                    <div style={{fontSize:9, color:"var(--txt3)"}}>2 ตัวบน</div>
                    <div style={{fontFamily:"Chakra Petch,sans-serif", fontSize:18, color:"var(--blue)"}}>{derivedLao.top2}</div>
                  </div>
                </div>
              </div>
            )}

            <button 
              id="btn-save-lao" 
              className="btn btn-g" 
              onClick={handleSave} 
              disabled={!isLaoValid || addMutation.isPending} 
              style={{height:38, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:"6px"}}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>บันทึกผลหวยลาว</span>
                </>
              )}
            </button>
          </div>
        ) : (
          // Thai manual form
          <div>
            <div className="grid-res grid-cols-1 md:grid-cols-2" style={{marginBottom:12}}>
              <div>
                <label className="lbl">วันที่ออกรางวัล (ค.ศ.)</label>
                <input type="date" className="inp" value={newDate} onChange={e=>setNewDate(e.target.value)}/>
              </div>
              <div>
                <label className="lbl">รางวัลที่ 1 (6 หลัก)</label>
                <input id="inp-first" className="inp" maxLength={6} placeholder="123456"
                  value={newFirst} onChange={e=>setNewFirst(e.target.value.replace(/\D/g,""))}/>
              </div>
            </div>
            <div className="grid-res grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{marginBottom:12}}>
              {[
                ["เลขหน้า 3 ตัวชุดที่ 1", newFront3a, setNewFront3a, 3],
                ["เลขหน้า 3 ตัวชุดที่ 2", newFront3b, setNewFront3b, 3],
                ["เลขท้าย 3 ตัวชุดที่ 1", newBack3a, setNewBack3a, 3],
                ["เลขท้าย 3 ตัวชุดที่ 2", newBack3b, setNewBack3b, 3],
              ].map(([l, v, s, mx]) => (
                <div key={l}>
                  <label className="lbl">{l}</label>
                  <input className="inp" maxLength={mx} placeholder={"0".repeat(mx)}
                    value={v} onChange={e=>s(e.target.value.replace(/\D/g,""))}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex", gap:12, alignItems:"flex-end"}}>
              <div style={{flex:1, maxWidth:160}}>
                <label className="lbl">เลขท้าย 2 ตัว *</label>
                <input id="inp-back2" className="inp" maxLength={2} placeholder="09"
                  value={newBack2} onChange={e=>setNewBack2(e.target.value.replace(/\D/g,""))}/>
              </div>
              <button id="btn-save" className="btn btn-g" onClick={handleSave} disabled={!isThaiValid} style={{height:38, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:"6px"}}>
                <Save size={14} />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Table Draw History ── */}
      <div className="card">
        <div className="ctitle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <ClipboardList size={14} style={{ color: "var(--accent)" }} />
            <span>ประวัติการออกรางวัล {searchTerm ? `(พบ ${filteredHistory.length} จาก ${history.length} งวด)` : `ครบ ${history.length} งวด`}</span>
          </div>

          {/* Real-time Search Box */}
          <div style={{ display: "inline-flex", alignItems: "center", position: "relative", minWidth: 200 }}>
            <Search size={12} style={{ position: "absolute", left: 10, color: "var(--txt3)" }} />
            <input 
              type="text" 
              placeholder="ค้นหาตัวเลขหรือวันที่..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 12px 6px 30px",
                fontSize: 12,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 6,
                color: "var(--txt)",
                outline: "none",
                transition: "all 0.2s"
              }}
            />
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            {lotteryType === "lao" ? (
              // Lao polymorphic table headers + rows
              <>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>งวด (พ.ศ.)</th>
                    <th>วันที่</th>
                    <th>4 ตัวท้าย</th>
                    <th>3 ตัวบน</th>
                    <th>2 ตัวบน</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((row, i) => (
                      <tr key={row.id || i}>
                        <td style={{color:"var(--txt3)"}}>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                        <td style={{color:"var(--txt3)", fontSize:11}}>{row.year}</td>
                        <td style={{color:"var(--txt3)", fontSize:11}}>{fmtTH(row.dateTH || row.date)}</td>
                        <td style={{fontFamily:"Cinzel,serif", fontSize:16, color:"var(--lao-accent2)", letterSpacing:2, fontWeight:700}}>{row.tail4}</td>
                        <td style={{fontFamily:"Chakra Petch,sans-serif", fontSize:13, color:"var(--green)", letterSpacing:1}}>{row.top3}</td>
                        <td style={{fontFamily:"Chakra Petch,sans-serif", fontSize:13, color:"var(--blue)", letterSpacing:1}}>{row.top2}</td>
                        <td style={{fontSize:10, color: row.verified ? "var(--green)" : "var(--gold)", display: "inline-flex", alignItems: "center", gap: "4px"}}>
                          {row.verified ? (
                            <>
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                              <span>ยืนยันแล้ว</span>
                            </>
                          ) : (
                            <>
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />
                              <span>สำรอง</span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--txt3)" }}>
                        ไม่พบข้อมูลตามคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            ) : (
              // Thai Table headers + rows
              <>
                <thead>
                  <tr>
                    <th>#</th><th>งวด (พ.ศ.)</th><th>วันที่</th>
                    <th>รางวัลที่ 1</th>
                    <th>เลขหน้า 3 ตัว</th><th>เลขท้าย 3 ตัว</th>
                    <th>เลขท้าย 2 ตัว</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((row, i) => (
                      <tr key={row.id || i}>
                        <td style={{color:"var(--txt3)"}}>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                        <td style={{color:"var(--txt3)",fontSize:11}}>{row.year}</td>
                        <td style={{color:"var(--txt3)",fontSize:11}}>{fmtTH(row.dateTH)}</td>
                        <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:13,color:"var(--gold3)",letterSpacing:2}}>{row.first}</td>
                        <td style={{color:"var(--green)",fontFamily:"Chakra Petch,sans-serif",fontSize:12,letterSpacing:1}}>
                          {(row.front3 || []).join(" / ")}
                        </td>
                        <td style={{color:"var(--blue)",fontFamily:"Chakra Petch,sans-serif",fontSize:12,letterSpacing:1}}>
                          {(row.back3 || []).join(" / ")}
                        </td>
                        <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:16,color:"var(--red)",fontWeight:700,letterSpacing:4}}>
                          {row.back2}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--txt3)" }}>
                        ไม่พบข้อมูลตามคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: "14px 4px 4px 4px", borderTop: "1px solid var(--bdr2)", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--txt3)" }}>
              แสดง {Math.min(filteredHistory.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredHistory.length, currentPage * itemsPerPage)} จาก {filteredHistory.length} งวด
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button 
                className="btn btn-b" 
                style={{ padding: "4px 10px", fontSize: 12, minWidth: 70, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={12} />
                <span>ก่อนหน้า</span>
              </button>
              
              <span style={{ fontSize: 12, color: "var(--txt2)", margin: "0 8px" }}>
                หน้า <strong>{currentPage}</strong> / {totalPages}
              </span>
              
              <button 
                className="btn btn-b" 
                style={{ padding: "4px 10px", fontSize: 12, minWidth: 70, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <span>ถัดไป</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
