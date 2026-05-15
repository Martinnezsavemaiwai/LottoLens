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
 * คำนวณงวดถัดไป
 */
export function getNextDraw() {
  const now = new Date();
  const thYear = now.getFullYear() + 543;
  const m = now.getMonth() + 1;
  const day = now.getDate();
  
  if (day <= 1) return `1 ${MONTHS_TH[m]} ${thYear}`;
  if (day <= 16) return `16 ${MONTHS_TH[m]} ${thYear}`;
  
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? thYear + 1 : thYear;
  return `1 ${MONTHS_TH[nm]} ${ny}`;
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

// Re-export JSX atoms for convenience (ไฟล์จริงอยู่ที่ src/components/ui/atoms.jsx)
export { CTip, DBall } from "../components/ui/atoms.jsx";
