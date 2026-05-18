import { useState } from "react";
import { fmtTH } from "../../utils/helpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncDraws } from "../../services/api";

/**
 * Tab: HistTab — เพิ่มผลหวยงวดใหม่ + แสดงตาราง history ทั้งหมด
 * @param {{ history: Array }} props
 */
export default function HistTab({ history }) {
  const queryClient = useQueryClient();
  const [newDate, setNewDate]       = useState("");
  const [newFirst, setNewFirst]     = useState("");
  const [newFront3a, setNewFront3a] = useState("");
  const [newFront3b, setNewFront3b] = useState("");
  const [newBack3a, setNewBack3a]   = useState("");
  const [newBack3b, setNewBack3b]   = useState("");
  const [newBack2, setNewBack2]     = useState("");
  const [added, setAdded]           = useState(false);

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: syncDraws,
    onSuccess: () => {
      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ["draws"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      alert("✅ Sync ข้อมูลล่าสุดเรียบร้อยแล้ว!");
    },
    onError: (err) => {
      alert("❌ Sync ล้มเหลว: " + (err.response?.data?.details || err.message));
    }
  });

  function thYear(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${parseInt(y)+543}-${m}-${day}`;
  }

  function add() {
    // Note: Manual add should ideally be an API call now.
    // For Phase 2, we prioritize Sync and API data.
    alert("ขออภัย: ใน Phase นี้กรุณาใช้ระบบ Sync อัตโนมัติเท่านั้น เพื่อความถูกต้องของฐานข้อมูล");
  }

  const valid = newDate && newFirst.length===6 && newBack2.length===2;

  return (
    <div className="fade">
      <div className="card mt">
        <div className="ctitle" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span>➕ เพิ่มผลหวยงวดใหม่</span>
          <button 
            className="btn btn-b" 
            style={{fontSize: 11, padding: '4px 10px', height: 'auto'}}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? "⏳ กำลัง Sync..." : "🔄 Sync จาก Sanook (Auto)"}
          </button>
        </div>
        <div className="grid-res grid-cols-1 md:grid-cols-2" style={{marginBottom:12}}>
          <div>
            <label className="lbl">วันที่ออกรางวัล (คศ.)</label>
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
        <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
          <div style={{flex:1,maxWidth:160}}>
            <label className="lbl">เลขท้าย 2 ตัว *</label>
            <input id="inp-back2" className="inp" maxLength={2} placeholder="09"
              value={newBack2} onChange={e=>setNewBack2(e.target.value.replace(/\D/g,""))}/>
          </div>
          <button id="btn-save" className="btn btn-g" onClick={add} disabled={!valid} style={{height:38}}>
            {added?"✅ บันทึกแล้ว":"💾 บันทึก"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="ctitle">📋 ประวัติครบ {history.length} งวด</div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>งวด (พ.ศ.)</th><th>วันที่</th>
                <th>รางวัลที่ 1</th>
                <th>เลขหน้า 3 ตัว</th><th>เลขท้าย 3 ตัว</th>
                <th>เลขท้าย 2 ตัว</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i}>
                  <td style={{color:"var(--txt3)"}}>{i+1}</td>
                  <td style={{color:"var(--txt3)",fontSize:11}}>{row.year}</td>
                  <td style={{color:"var(--txt3)",fontSize:11}}>{fmtTH(row.dateTH)}</td>
                  <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:13,color:"var(--gold3)",letterSpacing:2}}>{row.first}</td>
                  <td style={{color:"var(--green)",fontFamily:"Chakra Petch,sans-serif",fontSize:12,letterSpacing:1}}>
                    {row.front3.join(" / ")}
                  </td>
                  <td style={{color:"var(--blue)",fontFamily:"Chakra Petch,sans-serif",fontSize:12,letterSpacing:1}}>
                    {row.back3.join(" / ")}
                  </td>
                  <td style={{fontFamily:"Chakra Petch,sans-serif",fontSize:16,color:"var(--red)",fontWeight:700,letterSpacing:4}}>
                    {row.back2}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
