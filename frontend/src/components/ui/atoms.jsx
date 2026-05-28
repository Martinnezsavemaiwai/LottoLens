/**
 * Shared reusable UI atoms — CTip, DBall
 * แยกออกมาเป็น .jsx เพราะมี JSX syntax
 * @module components/ui/atoms
 */

/**
 * Custom Recharts Tooltip
 */
export function CTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"var(--s1)",border:"1px solid rgba(201,149,42,0.3)",borderRadius:8,padding:"7px 12px",fontSize:12}}>
      <div style={{color:"var(--gold)",marginBottom:3}}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{color:p.color||"#f0b429"}}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

/**
 * Digit Ball — แสดงตัวเลขรูปวงกลมสีต่างๆ
 */
export function DBall({ d, cls, count, label }) {
  return (
    <div style={{textAlign:"center"}}>
      <div className={`dball ${cls}`}>
        {d}
        <span className="dball-sub">{count}x</span>
      </div>
      {label && <div style={{fontSize:9,color:"var(--txt3)",marginTop:4}}>{label}</div>}
    </div>
  );
}
