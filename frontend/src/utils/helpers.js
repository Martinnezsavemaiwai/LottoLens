/**
 * Helper utilities — date formatting, JSON parsing
 * JSX components (CTip, DBall) → src/components/ui/atoms.jsx
 * @module utils/helpers
 */

export const MONTHS_TH = ["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

/**
 * Formats a date string from "YYYY-MM-DD" (where YYYY is Buddhist Era year) to "D Month YYYY" in Thai format.
 * Example: "2568-04-01" -> "1 เม.ย. 2568"
 * @param {string} d
 * @returns {string}
 */
export function formatThaiDate(d) {
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS_TH[parseInt(m)]} ${y}`;
}

/**
 * Calculates the next Thai government lottery draw date.
 * Draws usually occur on the 1st and 16th of each month, with some exceptions for holidays.
 * @returns {string}
 */
export function getNextDraw() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = now.getHours();
  
  const getDrawsForMonth = (m) => {
    if (m === 1) return [17]; // Jan 1 moved to Dec 30, Jan 16 moved to Jan 17
    if (m === 5) return [2, 16]; // May 1 moved to May 2
    if (m === 12) return [1, 16, 30]; // Next Jan 1 moved to Dec 30
    return [1, 16];
  };

  const currentMonthDraws = getDrawsForMonth(month);
  
  for (let drawDay of currentMonthDraws) {
    if (day < drawDay || (day === drawDay && hours < 16)) {
      return `${drawDay} ${MONTHS_TH[month]} ${year + 543}`;
    }
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthDraws = getDrawsForMonth(nextMonth);
  
  return `${nextMonthDraws[0]} ${MONTHS_TH[nextMonth]} ${nextYear + 543}`;
}

/**
 * Calculates the next Lao lottery draw date (held Monday - Friday at 20:00).
 * @returns {string}
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
  
  const buddhistYear = target.getFullYear() + 543;
  const m = target.getMonth() + 1;
  const d = target.getDate();
  return `${d} ${MONTHS_TH[m]} ${buddhistYear}`;
}

/**
 * Safely parses a JSON string, extracting the first JSON object match.
 * @param {string} text
 * @returns {Object|null}
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
 * Maps Backend LottoDraw model to Frontend format.
 * @param {Object} d
 * @returns {Object|null}
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
 * Maps Backend LaoLotteryResult model to Frontend format.
 * @param {Object} d
 * @returns {Object|null}
 */
export function mapBackendLaoDraw(d) {
  if (!d) return null;
  const iso = d.drawDate?.split('T')[0] || '';
  const [y, m, day] = iso.split('-');
  return {
    id: d.id,
    dateISO: iso,
    dateTH: `${parseInt(y)+543}-${m}-${day}`,
    full: d.tail4 ? "00" + d.tail4 : "000000",
    tail4: d.tail4,
    top3: d.top3,
    top2: d.top2,
    bottom2: d.bottom2,
    year: parseInt(y) + 543,
    month: parseInt(m),
    verified: d.isVerified
  };
}

/**
 * Converts technical error messages/objects into user-friendly Thai error messages.
 * @param {string|Object} err
 * @returns {string}
 */
export function getFriendlyErrorMessage(err) {
  if (!err) return "เกิดข้อผิดพลาดที่ไม่รู้จัก กรุณาลองใหม่อีกครั้ง";

  if (typeof err === "string") {
    const lower = err.toLowerCase();
    
    if (
      lower.includes("quota exceeded") ||
      lower.includes("429") ||
      lower.includes("rate limit") ||
      lower.includes("limit: 0") ||
      lower.includes("resourceexhausted") ||
      lower.includes("too many requests") ||
      lower.includes("retry in")
    ) {
      return "ขออภัยด้วยครับ โควตาการใช้งาน AI (Gemini) ของระบบฟรีเต็มแล้ว หรือมีการเรียกใช้งานบ่อยเกินไป กรุณารอสักครู่ (ประมาณ 1-2 นาที) แล้วลองใหม่อีกครั้งนะครับ";
    }

    if (
      lower.includes("api key") ||
      lower.includes("api_key") ||
      lower.includes("invalid key") ||
      lower.includes("invalid_key") ||
      lower.includes("unauthorized") ||
      lower.includes("gemini_api_key") ||
      lower.includes("key not found") ||
      lower.includes("key_not_found")
    ) {
      return "ไม่สามารถเชื่อมต่อระบบ AI ได้ เนื่องจากรหัสกุญแจเชื่อมต่อ (API Key) ไม่ถูกต้องหรือไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
    }

    if (
      lower.includes("overloaded") ||
      lower.includes("unavailable") ||
      lower.includes("503") ||
      lower.includes("502") ||
      lower.includes("bad gateway") ||
      lower.includes("service unavailable") ||
      lower.includes("gateway timeout") ||
      lower.includes("504")
    ) {
      return "เซิร์ฟเวอร์ AI ปลายทางขัดข้องชั่วคราวหรือกำลังทำงานหนักเกินไป กรุณาลองใหม่อีกครั้งในภายหลังครับ";
    }

    if (
      lower.includes("network error") ||
      lower.includes("failed to fetch") ||
      lower.includes("connrefused") ||
      lower.includes("timeout") ||
      lower.includes("unreachable")
    ) {
      return "ไม่สามารถเชื่อมต่อเครือข่ายไปยังเซิร์ฟเวอร์ AI ได้ กรุณาตรวจสอบอินเทอร์เน็ตและการเชื่อมต่อของคุณ";
    }

    return "เกิดข้อผิดพลาดในการประมวลผลของ AI กรุณาลองใหม่อีกครั้งในภายหลัง";
  }

  if (typeof err === "object") {
    const status = err.response?.status;
    const dataErr = err.response?.data?.error || err.response?.data?.details || err.response?.data?.message;

    if (dataErr && typeof dataErr === "string") {
      const friendly = getFriendlyErrorMessage(dataErr);
      if (friendly !== "เกิดข้อผิดพลาดในการประมวลผลของ AI กรุณาลองใหม่อีกครั้งในภายหลัง") {
        return friendly;
      }
    }

    if (status === 401) {
      return "คุณยังไม่ได้เข้าสู่ระบบ หรือเซสชันของคุณหมดอายุแล้ว กรุณาลงชื่อเข้าใช้งานใหม่อีกครั้ง";
    }
    if (status === 403) {
      return "คุณไม่มีสิทธิ์ในการเข้าถึงหรือดำเนินการในส่วนนี้";
    }
    if (status === 404) {
      return "ไม่พบข้อมูลหรือหน้าที่ต้องการบนเซิร์ฟเวอร์";
    }
    if (status === 429) {
      return "มีการส่งคำขอมากเกินไปชั่วคราว กรุณาเว้นระยะห่างและลองใหม่อีกครั้งในภายหลัง";
    }
    if (status >= 500) {
      return "ระบบหลังบ้านขัดข้องชั่วคราว (เซิร์ฟเวอร์ขัดข้อง) กรุณาติดต่อผู้ดูแลระบบ";
    }

    if (err.message) {
      const msgLower = err.message.toLowerCase();
      if (msgLower.includes("network error")) {
        return "การเชื่อมต่อเครือข่ายล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ตของคุณ";
      }
      if (msgLower.includes("timeout")) {
        return "หมดเวลารอการตอบรับจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง";
      }
      return err.message;
    }
  }

  return "เกิดข้อผิดพลาดที่ไม่รู้จัก กรุณาลองใหม่อีกครั้ง";
}

export { CTip, DBall } from "../components/ui/atoms.jsx";
