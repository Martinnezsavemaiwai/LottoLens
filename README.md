# 🏆 LottoLens: Advanced Multi-Lottery Analytics & AI Predictor

**LottoLens** (หรือ **LottoThaiLens**) เป็นแพลตฟอร์มวิเคราะห์สถิติผลสลากกินแบ่งรัฐบาลไทยและหวยต่างประเทศ (Full-stack) ที่ผสานขีดความสามารถของระบบฐานข้อมูลเชิงวิเคราะห์ (OLAP Big Data), Distributed Caching และ Generative AI (Google Gemini) เข้าด้วยกัน ระบบสามารถดึงข้อมูลและวิเคราะห์สถิติขั้นสูง เช่น Z-score, Markov Chain และ Positional Frequency เพื่อสร้าง Prompt Context ที่อิงตามหลักคณิตศาสตร์ ส่งต่อให้ AI ช่วยวิเคราะห์และทำนายผลได้อย่างมีหลักการ

---

## 📸 System Architecture

ระบบถูกออกแบบภายใต้สถาปัตยกรรมแบบ **Stateless & High-Performance Microservices** โดยมีการทำงานประสานกันดังแผนภาพด้านล่าง:

```mermaid
graph TD
    Client[React Frontend] -->|REST API Requests| API[Go Fiber Backend]
    API -->|1. Metadata & CRUD Queries| Postgres[(PostgreSQL via Prisma)]
    API -->|2. High-speed OLAP Analytics| ClickHouse[(ClickHouse OLAP)]
    API -->|3. Get/Set Cached Statistics| Redis[(Redis Cache)]
    API -->|4. Pull Real-time Draw Data| Sanook[Sanook API Scraper]
    Client -->|5. Context-based Prompt| Gemini[Google Gemini API]
```

---

## 🛠️ Tech Stack (เทคโนโลยีที่ใช้)

### **Frontend (หน้าบ้าน)**
- **Core:** React 18 (Vite)
- **State Management & Caching:** [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
- **UI/UX Design:** CSS (Custom Variable Theme) รองรับ Dark Mode, จัดวาง Layout แบบ Mobile-First Responsive Grid และใช้ Skeleton Loading เพื่อลดปัญหา Cumulative Layout Shift (CLS)
- **Visualization:** [Recharts](https://recharts.org/) สำหรับแสดงกราฟสถิติและแนวโน้ม Z-score
- **Icons:** Lucide React

### **Backend (หลังบ้าน)**
- **Language/Framework:** Go 1.24+ (Fiber v2 Web Framework)
- **Database ORM:** [Prisma Client Go](https://github.com/steebchen/prisma-client-go) (สำหรับเชื่อมต่อ PostgreSQL)
- **Logging:** ใช้ `log/slog` ของ Go จัดการ Log ในรูปแบบ JSON (Structured Logging)
- **Middleware:** CORS Middleware และ Rate Limiter (ป้องกันการเรียกใช้งาน AI API ถี่เกินไป)

### **Database & Cache (ฐานข้อมูลและแคช)**
- **Primary Database:** PostgreSQL 16 (จัดการข้อมูลหลักและ Metadata)
- **OLAP Database:** ClickHouse (ประมวลผลคณิตศาสตร์และสถิติปริมาณมาก เช่น Z-score และ Markov Chain)
- **In-Memory Cache:** Redis (แคชข้อมูลสถิติที่ถูกเรียกใช้บ่อย เพื่อให้ตอบสนองได้ในระดับ Sub-millisecond)

### **Generative AI**
- **Model:** Google Gemini 1.5 Pro / 2.5 Flash
- **Integration:** [@google/generative-ai SDK](https://www.npmjs.com/package/@google/generative-ai) พร้อมระบบ Auto-Fallback ที่จะสลับโมเดลอัตโนมัติหากโควต้าเต็มหรือระบบปลายทางขัดข้อง (HTTP 429/503)

---

## ✨ Key Features (ฟีเจอร์เด่น)

1. **Deep Statistical Analytics Engine:** วิเคราะห์สถิติเชิงลึกผ่าน ClickHouse ได้แก่
   - **Z-score Analysis:** วัดค่าเบี่ยงเบนมาตรฐานเพื่อหาตัวเลขที่มีโอกาสออกสูงกว่าค่าเฉลี่ย
   - **Markov Chain Transition:** วิเคราะห์ความน่าจะเป็นของตัวเลขที่จะออกถัดไป โดยอ้างอิงจากงวดล่าสุด
   - **Positional Frequency:** วิเคราะห์ความถี่ของตัวเลขแยกตามหลัก (เช่น หลักสิบและหลักหน่วยของเลขท้าย 2 ตัว)
   - **Recency Weighted Trends:** ถ่วงน้ำหนักความถี่ตามความใหม่ของข้อมูล (ให้น้ำหนักข้อมูลจากงวดล่าสุดมากกว่างวดเก่า)
2. **AI-Powered Prediction:** นำสถิติจาก ClickHouse มารวมเป็น Context เพื่อส่งให้ Gemini วิเคราะห์ ทำให้ผลลัพธ์การทำนายอ้างอิงจากข้อมูลจริงทางคณิตศาสตร์แทนการสุ่ม
3. **Multi-Lottery Engine (API v2):** โครงสร้าง API รองรับหวยหลายประเภท รวมถึง **หวยลาวพัฒนา** นอกเหนือจากสลากกินแบ่งรัฐบาล
4. **Automated Data Scraper:** ดึงผลรางวัลล่าสุดอัตโนมัติจาก API ของ Sanook พร้อมระบบ Cold Start Auto-Seeding ที่จะดึงข้อมูลตั้งต้นทันทีเมื่อเปิดเซิร์ฟเวอร์
5. **API Hardening & Security:**
   - **Rate Limiting:** จำกัดจำนวนครั้งการเรียก API ของ AI เพื่อป้องกันการสแปม
   - **Structured JSON Logging:** บันทึก Log เป็น JSON เพื่อให้ตรวจสอบและแก้ไขปัญหา (Debugging) บนคลาวด์ได้ง่ายขึ้น
   - **Deep System Health Check:** มี Endpoint `/health` ตรวจสอบสถานะการเชื่อมต่อของ Database ทั้งหมดแบบเรียลไทม์

---

## 🏃 Installation & Getting Started (การติดตั้งและใช้งาน)

เลือกวิธีติดตั้งได้ 2 รูปแบบตามความสะดวก:

### **วิธีที่ 1: รันผ่าน Docker Compose (แนะนำสำหรับการใช้งานทั่วไป)**

วิธีนี้จะสร้าง Container สำหรับบริการทั้งหมด (Postgres, ClickHouse, Redis, Migration, API และ Frontend) ให้พร้อมใช้งานทันที

1. **ตั้งค่า Environment Variables:**
   สร้างไฟล์ `.env` ในโฟลเดอร์หลัก, โฟลเดอร์ `backend/` และ `frontend/` (คัดลอกไฟล์ต้นแบบจาก `.env.example`)
2. **เริ่มต้นการทำงานด้วย Docker:**
   ```bash
   docker-compose up --build -d
   ```
3. **การเข้าใช้งาน:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8081/api/v1](http://localhost:8081/api/v1)
   - **API Health Check:** [http://localhost:8081/health](http://localhost:8081/health)

---

### **วิธีที่ 2: รันแยกทีละส่วน (สำหรับนักพัฒนา - Local Development)**

#### **ส่วน Backend (Go):**
1. ติดตั้ง Go (1.24+) และเตรียม PostgreSQL, ClickHouse, Redis ให้พร้อมใช้งาน
2. เข้าไปที่โฟลเดอร์ `backend/` และตั้งค่า `.env`:
   ```bash
   cp .env.example .env
   # แก้ไข URL และรหัสผ่านฐานข้อมูลในไฟล์ .env ให้ถูกต้อง
   ```
3. ติดตั้งแพ็กเกจและเตรียมฐานข้อมูล:
   ```bash
   go mod tidy
   
   # สร้าง Prisma Client
   make generate       # หรือ .\run.ps1 generate (Windows)
   
   # อัปเดต Schema ไปยัง PostgreSQL
   make migrate        # หรือ .\run.ps1 migrate
   ```
4. สร้างข้อมูลตั้งต้น (Seed) และรันเซิร์ฟเวอร์:
   ```bash
   make seed           # หรือ .\run.ps1 seed
   make dev            # หรือ .\run.ps1 dev
   ```

#### **ส่วน Frontend (React):**
1. ติดตั้ง Node.js (18+)
2. เข้าไปที่โฟลเดอร์ `frontend/` และตั้งค่า `.env`:
   ```bash
   cp .env.example .env
   # ใส่ API Key ใน VITE_GEMINI_API_KEY
   ```
3. ติดตั้ง Dependencies และรันแอปพลิเคชัน:
   ```bash
   npm install
   npm run dev
   ```
   สามารถเข้าใช้งานหน้าเว็บได้ที่ [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Configuration (การตั้งค่าตัวแปร)

### **Backend (`backend/.env`)**
| ตัวแปร | คำอธิบาย | ค่าเริ่มต้นตัวอย่าง |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection String ของ PostgreSQL | `postgresql://postgres:password@localhost:5433/lotto_db?schema=public` |
| `PORT` | พอร์ตของ API Backend | `8081` |
| `CLICKHOUSE_HOST` | ที่อยู่ของ ClickHouse Server | `localhost` |
| `CLICKHOUSE_USER` | ชื่อผู้ใช้ ClickHouse | `default` |
| `CLICKHOUSE_PASSWORD`| รหัสผ่าน ClickHouse | `lotto_pass` |
| `REDIS_HOST` | ที่อยู่ของ Redis | `localhost:6379` |

### **Frontend (`frontend/.env`)**
| ตัวแปร | คำอธิบาย | ค่าเริ่มต้นตัวอย่าง |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL ของ Backend API | `http://localhost:8081/api/v1` |
| `VITE_GEMINI_API_KEY` | API Key ของ Google Generative AI | `AIzaSyBIwcnlwG9QAdc...` |

---

## 📊 API Usage Examples (ตัวอย่างการเรียกใช้งาน API)

### 1. **ดึงสถิติความถี่ของการออกรางวัล**
- **Endpoint:** `GET /api/v1/stats/frequency`
- **Query Parameters:** `prize_type` (เช่น `back2`, `first`), `limit` (จำนวนข้อมูล)
- **ผลลัพธ์ (JSON):**
```json
[
  { "number": "36", "count": 18 },
  { "number": "85", "count": 15 }
]
```

### 2. **ขอข้อมูล Context สำหรับให้ AI วิเคราะห์**
- **Endpoint:** `GET /api/v1/ai/context`
- **ผลลัพธ์ (JSON):**
```json
{
  "context": "# Thai Lotto Mathematical Analysis Context\nPrize Type: back2...",
  "raw_stats": { ... }
}
```

### 3. **ตรวจสอบสถานะระบบ (Health Check)**
- **Endpoint:** `GET /health`
- **ผลลัพธ์ (JSON):**
```json
{
  "status": "processed",
  "postgres": "up",
  "clickhouse": "up",
  "redis": "up",
  "server_time": "2026-05-25T14:35:00+07:00"
}
```

### 4. **บันทึกผลการออกรางวัล (ตัวอย่างสำหรับหวยลาว)**
- **Endpoint:** `POST /api/v2/lottery/result`
- **Request Body (JSON):**
```json
{
  "type": "lao",
  "date": "2026-05-25",
  "full": "807095",
  "verified": true
}
```

---

## 🎯 Roadmap & Future Plans

LottoLens มีแผนพัฒนาฟีเจอร์เพิ่มเติมเพื่อยกระดับสู่ระบบ Production ที่สมบูรณ์แบบ:

- [ ] **AI Fine-tuning:** ปรับปรุงโครงสร้าง Prompt (Chain-of-Thought) เพื่อการวิเคราะห์ที่แม่นยำยิ่งขึ้น
- [ ] **Backtesting Engine:** สร้างระบบจำลองการสุ่มซื้อหวยย้อนหลัง เพื่อประเมินความแม่นยำของโมเดล AI
- [ ] **Interactive Charts:** นำเทคโนโลยี Recharts มาใช้แสดงกราฟแนวโน้มแบบ Interactive อย่างเต็มรูปแบบ
- [ ] **Dark/Light Mode:** รองรับการสลับธีมสีอย่างสมบูรณ์แบบครอบคลุมทุกหน้าจอ
- [ ] **Progressive Web App (PWA):** ทำให้ระบบรองรับการติดตั้งเป็นแอปพลิเคชันบนสมาร์ตโฟน
- [ ] **CI/CD Pipeline & Monitoring:** ผสาน GitHub Actions ร่วมกับ Prometheus และ Grafana
- [ ] **API Documentation:** จัดทำเอกสาร API ด้วย Swagger

---

## 🤝 การมีส่วนร่วม (Contributing)

หากคุณสนใจร่วมพัฒนาโปรเจกต์ สามารถทำตามขั้นตอนต่อไปนี้ได้เลย:
1. Fork โปรเจกต์นี้
2. สร้าง Branch สำหรับฟีเจอร์ของคุณ (`git checkout -b feature/AmazingFeature`)
3. Commit โค้ดของคุณ (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปที่ Branch นั้น (`git push origin feature/AmazingFeature`)
5. สร้าง Pull Request เพื่อเสนอการเปลี่ยนแปลง

---
*โปรเจกต์นี้ถูกสร้างสรรค์ขึ้นเพื่อการศึกษาและการประยุกต์ใช้คณิตศาสตร์เชิงสถิติอย่างสนุกสนานและมีสาระ 🎯*