/**
 * Shared reusable UI atoms — CTip, DBall
 * @module components/ui/atoms
 */

/**
 * Custom Recharts Tooltip Component — Editorial design
 */
export function CTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div 
      style={{
        background: "var(--s1)",
        border: "1px solid var(--bdr)",
        borderRadius: "var(--r)",
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "var(--glow)",
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      <div style={{ color: "var(--accent)", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "var(--txt2)", fontSize: 12 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/**
 * Digit Ball Component — displays numbers inside colored circles
 */
export function DBall({ d, cls, count, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className={`dball ${cls}`}>
        {d}
        <span className="dball-sub">{count}x</span>
      </div>
      {label && <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>}
    </div>
  );
}
