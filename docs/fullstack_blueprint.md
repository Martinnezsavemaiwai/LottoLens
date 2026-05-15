# 🏛️ Architecture & Implementation Blueprint: Thai Lotto Analytics (Monorepo)
**Role:** Principal Software Architect & Full-Stack Engineer

เอกสารนี้ระบุทิศทางการพัฒนาเพื่อเปลี่ยนผ่านจาก **Frontend-heavy Calculation** ไปสู่ **High-performance Analytics Engine** โดยใช้ Go และ ClickHouse เพื่อรองรับการคำนวณสถิติขั้นสูง (Markov Chain, Z-score) สำหรับข้อมูลหวยย้อนหลังนับ 30 ปี

---

## 1. Current State Assessment (การประเมินสถานะปัจจุบัน)

### 📊 ระบบปัจจุบัน:
- **Frontend (React):** เป็น "Brain" ของระบบในขณะนี้ มี `mathEngine.js` ทำหน้าที่คำนวณทุกอย่าง ตั้งแต่ Frequency พื้นฐานไปจนถึง Markov Chain และ Z-score ซึ่งทำงานได้ดีกับข้อมูลชุดเล็ก แต่จะเริ่มหน่วง (UI Jitter) เมื่อข้อมูลมีขนาดใหญ่ขึ้น
- **Backend (Go/Fiber):** ทำหน้าที่เป็น "Data Proxy" เบื้องต้น มี Scraper ดึงข้อมูลจาก Sanook และบันทึกลง PostgreSQL (Prisma) และมี ClickHouse Repo พื้นฐานที่ยังไม่ได้เชื่อมต่อกับ Business Logic ส่วนใหญ่
- **Data Flow:** `Scraper -> Postgres -> (Wait for API) -> Frontend (Local Math Engine) -> AI Analysis`

### ⚠️ คอขวด (Bottlenecks):
1. **Frontend Latency:** การคำนวณสถิติเชิงลึก (Deep Analytics) บน Browser กิน CPU สูง
2. **Cold Start Data:** ข้อมูลถูกเก็บเป็น Static JS File (`history.js`) ทำให้การ Update งวดใหม่ต้องทำ Manual หรือรอ Build ใหม่
3. **Database Silo:** PostgreSQL ไม่เหมาะกับการทำ Aggregate Query หนักๆ เช่น "หาความถี่เลขท้าย 2 ตัวย้อนหลัง 20 ปี แยกตามวันในสัปดาห์"

---

## 2. Refactoring Strategy: Moving to Backend
เราจะย้าย Logic จาก `mathEngine.js` ไปเป็น **Go Micro-services** ดังนี้:

| ฟังก์ชัน (JS) | เป้าหมายใหม่ (Go/ClickHouse) | เหตุผลด้าน Performance |
| :--- | :--- | :--- |
| `getStats` | `StatsService.GetFrequency` | ใช้ ClickHouse `COUNT()` พร้อม `GROUP BY` เร็วกว่า JS Loop 10-50 เท่า |
| `Markov Chain` | `AnalyticsService.PredictMarkov` | ClickHouse สามารถทำ Transition Matrix ผ่าน `neighbor()` function ได้ในระดับ Query |
| `Z-score / Chi2` | `StatsService.GetAnomalies` | คำนวณ Standard Deviation และ Mean บน Database แทนการดึง Array มาวน Loop |
| `ngramFreq` | `AnalyticsService.GetPatterns` | ใช้ ClickHouse `Array` functions จัดการเลขชุด (front3, back3) ได้อย่างรวดเร็ว |

---

## 3. Database Architecture & Routing

เพื่อให้ได้ประสิทธิภาพสูงสุด เราจะใช้ **Polyglot Persistence**:

### A. PostgreSQL (Prisma) - "Source of Truth"
- **บทบาท:** เก็บข้อมูลดิบ (Transactional Data), User Preferences, และ Metadata
- **ทำไมต้องใช้:** ต้องการ ACID Compliance สำหรับการ Sync ข้อมูลไม่ให้ซ้ำ (Unique Constraint บน `drawDate`)
- **Table:** `LottoDraw`

### B. ClickHouse - "OLAP Powerhouse"
- **บทบาท:** เก็บข้อมูลแบบ Denormalized สำหรับการทำ Analytics โดยเฉพาะ
- **Table Structure:**
    ```sql
    CREATE TABLE draw_analytics (
        draw_date Date,
        prize_type Enum8('first', 'front3', 'back3', 'back2'),
        number String,
        pos1 UInt8, pos2 UInt8, pos3 UInt8, -- แยกหลักเพื่อทำ Positional Analysis
        is_odd UInt8,
        is_high UInt8
    ) ENGINE = MergeTree() ORDER BY (prize_type, draw_date);
    ```
- **Data Sync:** ทุกครั้งที่ Scraper บันทึกลง Postgres ให้ทำการ "Fan-out" ยิงเข้า ClickHouse ทันที

---

## 4. API Contract (Go Backend)

ออกแบบ Endpoint ใหม่เพื่อรองรับ UI:

### 📡 Analytics API (`/api/v1/stats`)
- `GET /frequency?type=back2&limit=10` : ดึงเลขเด่นตามความถี่
- `GET /patterns?type=back3` : ดึงเลขชุดที่ออกบ่อย (N-gram)
- `GET /deep-analysis` : คืนค่า Z-score, Chi-square และ Entropy ของแต่ละหลัก
- `GET /prediction/markov?last_num=36` : คืนค่าความน่าจะเป็นของเลขถัดไป

### 🤖 AI Context API
- `GET /ai/context?mode=back2` : สร้าง Prompt Context อัตโนมัติจากสถิติที่คำนวณแล้วบน Backend เพื่อส่งให้ Gemini (ลด Payload ระหว่าง Client-Server)

---

## 5. Actionable Roadmap (สำหรับ AI Agent/Antigravity)

คัดลอกส่วนนี้ไปสั่ง AI Agent ให้เริ่มทำงาน:

### **Phase 1: Backend Heavy Lifting (Go & ClickHouse)**
1. **Implement ClickHouse Sync:** ใน `LottoService.SyncLatest`, หลังจาก `repo.Upsert` สำเร็จ ให้เรียก `chRepo.InsertDrawAnalytics` เพื่อกระจายข้อมูลรางวัลลงใน ClickHouse Table
2. **Port Math Engine to Go:** สร้าง `internal/services/analytics_service.go` และพอร์ต Logic `Z-score`, `Markov`, และ `Positional Freq` จาก `mathEngine.js` โดยใช้ SQL Query เป็นหลัก
3. **Build API Endpoints:** สร้าง Handler สำหรับ `/stats/frequency` และ `/stats/deep-analytics`

### **Phase 2: Frontend Modernization (React)**
1. **API Integration:** เปลี่ยนการเรียก `getStats(history)` ใน `App.jsx` ให้เป็นการ `fetch()` ข้อมูลจาก Go API
2. **State Management:** ใช้ `React Query` (TanStack Query) เพื่อจัดการ Caching ของข้อมูลสถิติ
3. **AI Logic Shift:** ย้ายการสร้าง Prompt จาก `mathEngine.js` ไปอยู่บน Backend แล้วให้ Frontend รับข้อความสำเร็จรูปมาส่งต่อให้ Gemini

### **Phase 3: Optimization & Scaling**
1. **Caching Layer:** ใช้ Redis (มีโครงสร้าง `CacheService` อยู่แล้ว) เพื่อเก็บผลลัพธ์ของ `GetSummary` ที่ไม่เปลี่ยนแปลงบ่อย
2. **Materialized Views:** สร้าง MV ใน ClickHouse สำหรับคำนวณ `Frequency` ล่วงหน้า เพื่อให้ Query `/stats` ตอบกลับในระดับ < 10ms

---
**Next Step:** สั่ง AI Agent ว่า *"เริ่ม Phase 1: สร้างฟังก์ชัน InsertDrawAnalytics ใน ClickHouseRepo และเชื่อมโยงกับ LottoService.SyncLatest"*
