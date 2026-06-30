import { BarChart3, TrendingUp, Check, Award } from "lucide-react";

/**
 * EvidencePanel — Displays the four mathematical model sub-scores and the
 * composite Final Score for the top-ranked prediction candidate.
 * All evidence fields gracefully fallback to 0 for missing or malformed data.
 *
 * @param {{ evidence: Object|undefined, accentColor: string }} props
 */
export default function EvidencePanel({ evidence, accentColor }) {
  const color = accentColor || "var(--accent)";
  function safeScore(val) {
    const n = Number(val);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
  }
  const scores = [
    { id: "ev-positional", label: "Positional Frequency", labelTH: "ความถี่ตามหลัก",       value: safeScore(evidence?.positional), barColor: "var(--gold)",   Icon: BarChart3  },
    { id: "ev-recency",    label: "Recency / Gap",        labelTH: "น้ำหนักช่วงงวด",       value: safeScore(evidence?.recency),    barColor: "var(--cyan)",   Icon: TrendingUp },
    { id: "ev-markov",    label: "Markov Transition",    labelTH: "การเปลี่ยนมาร์คอฟ",      value: safeScore(evidence?.markov),     barColor: "var(--purple)", Icon: TrendingUp },
    { id: "ev-pair",      label: "Pair Strength",        labelTH: "คู่ตัวเลขสัมพันธ์",    value: safeScore(evidence?.pair),       barColor: "var(--green)",  Icon: Check      },
  ];
  const finalScore = safeScore(evidence?.finalScore);
  const finalColor = finalScore >= 70 ? "var(--green)" : finalScore >= 45 ? "var(--gold)" : "var(--red)";
  return (
    <div
      id="evidence-panel"
      role="region"
      aria-label="Evidence Panel"
      style={{ border: `1px solid ${color}33`, background: "var(--s1)", borderRadius: 14, padding: 20, marginTop: 0 }}
    >
      <div className="ctitle" style={{ gap: "8px", marginBottom: 14 }}>
        <BarChart3 size={14} aria-hidden="true" style={{ color }} />
        <span style={{ color }}>Evidence Panel</span>
        <span className="csub">น้ำหนักหลักฐานทางคณิตศาสตร์ต่อตัวเลขเด่น</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {scores.map((s) => (
          <div key={s.id} id={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 180, display: "flex", flexDirection: "column" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--txt)", fontWeight: 600 }}>
                <s.Icon size={12} aria-hidden="true" style={{ color: s.barColor, flexShrink: 0 }} />
                {s.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--txt3)", letterSpacing: 0.5 }}>{s.labelTH}</span>
            </div>
            <div style={{ flex: 1, height: 7, background: "var(--s2)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--bdr2)" }}>
              <div style={{ height: "100%", width: `${s.value}%`, background: `linear-gradient(90deg, ${s.barColor}99, ${s.barColor})`, borderRadius: 99, transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)" }} />
            </div>
            <div style={{ minWidth: 38, textAlign: "right", fontFamily: "Chakra Petch, monospace", fontSize: 13, fontWeight: 700, color: s.barColor }}>
              {evidence ? `${s.value}` : "—"}
            </div>
          </div>
        ))}
      </div>
      <div
        id="ev-final-score"
        role="meter"
        aria-valuenow={finalScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Final Score: ${finalScore}`}
        style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: `${finalColor}0f`, border: `1.5px solid ${finalColor}44`, display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Award size={12} aria-hidden="true" style={{ color: finalColor }} />
            <span style={{ fontSize: 12, color: finalColor, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "Chakra Petch, monospace" }}>
              Final Score — คะแนนรวมถ่วงน้ำหนัก
            </span>
          </div>
          <div style={{ height: 10, background: "var(--s2)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--bdr2)" }}>
            <div style={{ height: "100%", width: `${finalScore}%`, background: `linear-gradient(90deg, ${finalColor}88, ${finalColor})`, borderRadius: 99, transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 0 8px ${finalColor}66` }} />
          </div>
        </div>
        <div style={{ fontFamily: "Chakra Petch, monospace", fontSize: 28, fontWeight: 900, color: finalColor, lineHeight: 1, textShadow: `0 0 12px ${finalColor}55`, minWidth: 56, textAlign: "right" }}>
          {evidence ? finalScore : "—"}
        </div>
      </div>
    </div>
  );
}
