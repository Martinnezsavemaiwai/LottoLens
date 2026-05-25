import { useRef, useLayoutEffect, useState } from "react";
import { useLottery } from "../../context/LotteryContext";

const LaoFlag = () => (
  <svg 
    width="16" 
    height="11" 
    viewBox="0 0 30 20" 
    style={{ 
      borderRadius: "1.5px", 
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)", 
      flexShrink: 0 
    }}
  >
    {/* Red background */}
    <rect width="30" height="20" fill="#CE1126" />
    {/* Blue middle stripe */}
    <rect y="5" width="30" height="10" fill="#002868" />
    {/* White circle */}
    <circle cx="15" cy="10" r="4" fill="#FFFFFF" />
  </svg>
);

const ThaiFlag = () => (
  <svg 
    width="16" 
    height="11" 
    viewBox="0 0 6 6" 
    style={{ 
      borderRadius: "1.5px", 
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)", 
      flexShrink: 0 
    }}
  >
    <rect width="6" height="1" fill="#A51931" />
    <rect y="1" width="6" height="1" fill="#F4F5F8" />
    <rect y="2" width="6" height="2" fill="#2D2A4A" />
    <rect y="4" width="6" height="1" fill="#F4F5F8" />
    <rect y="5" width="6" height="1" fill="#A51931" />
  </svg>
);

export default function LotterySwitcher() {
  const { lotteryType, setLotteryType } = useLottery();
  const laoRef  = useRef(null);
  const thaiRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 3, width: 0 });

  // Measure button positions to drive the sliding pill
  useLayoutEffect(() => {
    const active = lotteryType === "lao" ? laoRef.current : thaiRef.current;
    if (!active) return;
    const parent = active.closest(".lottery-switcher");
    if (!parent) return;
    const pr = parent.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    setPillStyle({ left: ar.left - pr.left, width: ar.width });
  }, [lotteryType]);

  return (
    <div className="lottery-switcher" role="tablist" aria-label="เลือกประเภทหวย">
      {/* Animated sliding pill */}
      <div
        className={`ls-pill ${lotteryType}`}
        style={{ left: pillStyle.left, width: pillStyle.width }}
        aria-hidden="true"
      />

      {/* Lao button */}
      <button
        ref={laoRef}
        id="switcher-lao"
        role="tab"
        aria-selected={lotteryType === "lao"}
        className={`ls-btn${lotteryType === "lao" ? " active-lao" : ""}`}
        onClick={() => setLotteryType("lao")}
      >
        <LaoFlag />
        <span>หวยลาวพัฒนา</span>
      </button>

      {/* Thai button */}
      <button
        ref={thaiRef}
        id="switcher-thai"
        role="tab"
        aria-selected={lotteryType === "thai"}
        className={`ls-btn${lotteryType === "thai" ? " active-thai" : ""}`}
        onClick={() => setLotteryType("thai")}
      >
        <ThaiFlag />
        <span>หวยไทย</span>
      </button>
    </div>
  );
}
