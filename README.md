```markdown
# 🏆 Thai Lotto Analytics (Production Ready)

แพลตฟอร์มวิเคราะห์สถิติสลากกินแบ่งรัฐบาลไทยยุคใหม่ ที่ผสมผสานขุมพลังของ **Big Data (ClickHouse)**, **Distributed Caching (Redis)** และ **Generative AI (Gemini 1.5 Pro)** เพื่อการวิเคราะห์ที่แม่นยำและลึกซึ้งที่สุด

## 🚀 ความสำเร็จของโครงการ (Phases 1-3)

- **Phase 1 (Backend Engine):** พัฒนาระบบหลังบ้านด้วย Go (Fiber) และเชื่อมต่อฐานข้อมูล Hybrid (PostgreSQL + ClickHouse) พร้อมระบบ Scraper อัตโนมัติ
- **Phase 2 (Frontend Modernization):** ปรับปรุง UI/UX ด้วย React และ React Query เพื่อการเชื่อมต่อ API แบบ Stateless และ High-performance
- **Phase 3 (Optimization & AI):** ติดตั้งระบบ Redis Caching เพื่อความรวดเร็ว และ AI Context API ที่รวบรวมสถิติเชิงคณิตศาสตร์ส่งให้ Gemini วิเคราะห์

## 🛠️ Stack เทคโนโลยี

- **Frontend:** React (Vite), Tailwind CSS, TanStack Query
- **Backend:** Go (Fiber), Prisma ORM (Go client)
- **Database:** PostgreSQL (Metadata), ClickHouse (OLAP Analytics)
- **Cache:** Redis
- **AI:** Google Gemini 1.5 Pro (via AI Context API)
- **DevOps:** Docker, Docker Compose

## 🏃 วิธีการเริ่มใช้งาน (Quick Start)

1. **เตรียม Environment:**
   สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/` และ `frontend/` (ดูตัวอย่างจาก `.env.example`)

2. **รันระบบผ่าน Docker:**
   ```bash
   docker-compose up --build -d
   ```

3. **เข้าใช้งาน:**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:8081/api/v1
   - **API Health Check:** http://localhost:8081/health

## 📊 ฟีเจอร์หลัก
- **Deep Statistics:** วิเคราะห์ Z-score, Markov Chain และ Positional Frequency
- **AI Prediction:** ระบบทำนายผลโดยใช้สถิติเชิงคณิตศาสตร์เป็น Context
- **Real-time Sync:** ดึงข้อมูลล่าสุดจาก Sanook API เพียงคลิกเดียว
```