
## [1.1.0-hardened] - 2026-05-16

### 🛠 1. Technical Changelog (For Engineering Team)
**Backend Hardening & Observability:**
- **Structured Logging:** Migrated from log.Println to log/slog for JSON-formatted logging, improving log analysis and observability.
- **API Security:** Implemented gofiber/fiber/v2/middleware/limiter on /api/v1/ai/context to mitigate potential resource exhaustion (5 requests/minute per IP).
- **Environment Handling:** Updated .env loading logic with better error reporting via slog.
- **Health Checks:** Refined health check responses to include specific status for Postgres, ClickHouse, and Redis.

**Frontend Performance & UX Optimization:**
- **Layout Shift Mitigation (CLS):** Introduced Skeleton component (shimmer effect) and migrated from full-screen loading spinners to component-level placeholders in App.jsx, Analytics.jsx, and AIPredict.jsx.
- **Responsive Design:** Replaced static grid classes (.g2, .g3, .g4) with a mobile-first responsive utility system (.grid-res) in 	heme.css.
- **Data Fetching Strategy:** Optimized TanStack Query configuration:
    - staleTime: Increased to 15 minutes.
    - gcTime: Increased to 30 minutes.
    - efetchOnWindowFocus: Set to alse to reduce unnecessary network traffic.
- **Mobile Navigation:** Added horizontal scroll support for the tab bar on small viewports.

---

### 📢 2. Client Release Notes (Thai Language)
**ไฮไลท์การอัปเดต - เวอร์ชั่น 1.1.0 (Hardened UI & Security)**

**1. เว็บไซต์ลื่นไหลและเสถียรยิ่งขึ้น (UI Improvements)**
- **ลดการกระตุกของหน้าจอ:** ระบบใหม่จะใช้โครงร่าง (Skeleton) แสดงผลขณะโหลดข้อมูล ช่วยให้หน้าเว็บไม่ขยับไปมาขณะข้อมูลกำลังมาถึง
- **รองรับมือถือเต็มรูปแบบ:** ปรับปรุงระบบตารางและเมนูให้ใช้งานง่ายขึ้นบนสมาร์ทโฟนทุกขนาดหน้าจอ
- **โหลดข้อมูลฉลาดขึ้น:** ลดการดึงข้อมูลซ้ำซ้อน ช่วยให้ประหยัดอินเทอร์เน็ตและเข้าหน้าเว็บได้เร็วขึ้นเมื่อสลับไปมา

**2. เสริมความปลอดภัยและเสถียรภาพ (Security & Stability)**
- **ระบบป้องกัน AI:** เพิ่มการจำกัดการเรียกใช้งาน AI ทำนายผล เพื่อให้มั่นใจว่าเซิร์ฟเวอร์จะทำงานได้อย่างราบรื่นและพร้อมให้บริการผู้ใช้ทุกคนอย่างเท่าเทียม
- **ระบบตรวจสอบภายในใหม่:** วิศวกรสามารถตรวจสอบปัญหาที่เกิดขึ้นได้รวดเร็วขึ้นผ่านระบบจัดเก็บ Log แบบใหม่ (Structured Logging)

**3. แก้ไขบั๊กและปรับปรุงทั่วไป**
- ปรับปรุงการแสดงผลรางวัลล่าสุดในหน้าแรกให้ชัดเจนขึ้น
- เพิ่มความแม่นยำในการระบุสถานะการเชื่อมต่อฐานข้อมูล

---
