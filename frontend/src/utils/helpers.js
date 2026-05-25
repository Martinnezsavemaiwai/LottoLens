/**
 * Helper utilities — date formatting, JSON parsing
 * JSX components (CTip, DBall) → src/components/ui/atoms.jsx
 * @module utils/helpers
 */

export const MONTHS_TH = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

/**
 * แปลงวันที่จาก "2568-04-01" (ISO format แต่ใช้ปี พ.ศ.) → "1 เม.ย. 2568"
 */
export function fmtTH(d) {
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS_TH[parseInt(m)]} ${y}`;
}

/**
 * คำนวณงวดถัดไปของหวยไทย
 */
export function getNextDraw() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = now.getHours();
  
  // Custom draw dates for Thai lottery
  const getDrawsForMonth = (m) => {
    if (m === 1) return [17]; // Jan 1 moved to Dec 30, Jan 16 moved to Jan 17
    if (m === 5) return [2, 16]; // May 1 moved to May 2
    if (m === 12) return [1, 16, 30]; // Next Jan 1 moved to Dec 30
    return [1, 16];
  };

  const currentMonthDraws = getDrawsForMonth(month);
  
  for (let drawDay of currentMonthDraws) {
    // If today is before the draw date, or it's the draw date but before 16:00
    if (day < drawDay || (day === drawDay && hours < 16)) {
      return `${drawDay} ${MONTHS_TH[month]} ${year + 543}`;
    }
  }

  // If all draws in current month have passed
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthDraws = getDrawsForMonth(nextMonth);
  
  return `${nextMonthDraws[0]} ${MONTHS_TH[nextMonth]} ${nextYear + 543}`;
}

/**
 * คำนวณงวดถัดไปของหวยลาวพัฒนา (ออกทุกวันจันทร์ - ศุกร์ เวลา 20.00 น.)
 */
export function getNextLaoDraw() {
  const now = new Date();
  let target = new Date(now);
  
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = target.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (i === 0) {
        const hours = now.getHours();
        if (hours >= 20) {
          target.setDate(target.getDate() + 1);
          continue;
        }
      }
      break;
    }
    target.setDate(target.getDate() + 1);
  }
  
  const thYear = target.getFullYear() + 543;
  const m = target.getMonth() + 1;
  const d = target.getDate();
  return `${d} ${MONTHS_TH[m]} ${thYear}`;
}

/**
 * Parse JSON string อย่างปลอดภัย — ดึง object แรกที่เจอ
 */
export function parseJson(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Map Backend LottoDraw model to Frontend format
 */
export function mapBackendDraw(d) {
  if (!d) return null;
  const iso = d.drawDate?.split('T')[0] || '';
  const [y, m, day] = iso.split('-');
  return {
    id: d.id,
    dateISO: iso,
    dateTH: `${parseInt(y)+543}-${m}-${day}`,
    first: d.firstPrize,
    front3: typeof d.front3 === 'string' ? JSON.parse(d.front3) : d.front3,
    back3: typeof d.back3 === 'string' ? JSON.parse(d.back3) : d.back3,
    back2: d.back2,
    year: parseInt(y) + 543,
    month: parseInt(m),
    drawDay: d.drawDay
  };
}

/**
 * Map Backend LaoLotteryResult model to Frontend format
 */
export function mapBackendLaoDraw(d) {
  if (!d) return null;
  const iso = d.drawDate?.split('T')[0] || '';
  const [y, m, day] = iso.split('-');
  return {
    id: d.id,
    dateISO: iso,
    dateTH: `${parseInt(y)+543}-${m}-${day}`,
    full: d.tail4 ? "00" + d.tail4 : "000000", // Lao seed is stored as full 6 digit in reference, we construct if needed, or if it doesn't matter we just use tail4
    tail4: d.tail4,
    top3: d.top3,
    top2: d.top2,
    bottom2: d.bottom2,
    year: parseInt(y) + 543,
    month: parseInt(m),
    verified: d.isVerified
  };
}

// Re-export JSX atoms for convenience (ไฟล์จริงอยู่ที่ src/components/ui/atoms.jsx)
export { CTip, DBall } from "../components/ui/atoms.jsx";
