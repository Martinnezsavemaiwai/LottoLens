import { Award, Target, BarChart3 } from "lucide-react";

/**
 * PerformanceTrackingPanel — Historical Performance Tracking dashboard.
 * Shows empirical hit rates at Top-10, Top-20, Top-50 thresholds in a
 * high-contrast 3-column grid with color-coded tier indicators.
 *
 * @param {{ hitRateTop10: number, hitRateTop20: number, hitRateTop50: number, total: number }} props
 */
export default function PerformanceTrackingPanel({ hitRateTop10, hitRateTop20, hitRateTop50, total }) {
  function tierColor(pct) {
    if (pct >= 70) return "var(--green)";
    if (pct >= 40) return "var(--gold)";
    return "var(--red)";
  }
  const tiers = [
    { id: "perf-top10", label: "Top 10", labelTH: "อันดับ 1-10", value: hitRateTop10 ?? 0, Icon: Award,     poolNote: "10 ตัว" },
    { id: "perf-top20", label: "Top 20", labelTH: "อันดับ 1-20", value: hitRateTop20 ?? 0, Icon: Target,    poolNote: "20 ตัว" },
    { id: "perf-top50", label: "Top 50", labelTH: "อันดับ 1-50", value: hitRateTop50 ?? 0, Icon: BarChart3, poolNote: "50 ตัว" },
  ];
  return (
    <div
      id="performance-tracking-panel"
      role="region"
      aria-label="Historical Performance Tracking"
      style={{ border: "1px solid var(--bdr2)", borderRadius: 13, padding: "16px 16px 14px", background: "var(--s1)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <BarChart3 size={14} aria-hidden="true" style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent3)" }}>Historical Performance Tracking</span>
        <span style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 0.5 }}>
          &mdash; อัตราเข้าเป้าเชิงประจักษ์ ({total} งวดจำลอง)
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(80px, 1fr))", gap: 10 }}>
        {tiers.map((t) => {
          const color = tierColor(t.value);
          return (
            <div
              key={t.id}
              id={t.id}
              role="group"
              aria-label={`${t.label}: ${t.value}%`}
              style={{ background: `${color}0d`, border: `1.5px solid ${color}33`, borderRadius: 10, padding: "14px 10px 12px", textAlign: "center", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", bottom: 0, left: 0, width: `${t.value}%`, height: 3, background: `linear-gradient(90deg, ${color}44, ${color})`, transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              <t.Icon size={14} aria-hidden="true" style={{ color, marginBottom: 6, display: "block", margin: "0 auto 6px" }} />
              <div style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontFamily: "Chakra Petch, monospace" }}>{t.label}</div>
              <div style={{ fontFamily: "Chakra Petch, monospace", fontSize: 28, fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 10px ${color}44`, marginBottom: 5 }}>{t.value}%</div>
              <div style={{ fontSize: 12, color: "var(--txt3)" }}>{t.labelTH}</div>
              <div style={{ fontSize: 12, color, opacity: 0.65, marginTop: 3 }}>pool: {t.poolNote}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { color: "var(--green)", label: "≥ 70% — ความลึกสูง" },
          { color: "var(--gold)",  label: "40–69% — ปานกลาง" },
          { color: "var(--red)",   label: "< 40% — ปรับน้ำหนักใหม่" },
        ].map((l) => (
          <div key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--txt3)" }}>
            <span aria-hidden="true" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
