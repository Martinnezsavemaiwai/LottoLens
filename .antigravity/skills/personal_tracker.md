# Personal Skill Development Tracker

## 1. Core Competencies (ทักษะที่เชี่ยวชาญแล้ว)
- **Full-stack System Design & Integration:** สามารถประยุกต์ใช้ฐานข้อมูลแบบ Hybrid (PostgreSQL + ClickHouse) ร่วมกับ Go Fiber และ Redis ในการทำสถิติ Big Data ได้อย่างเป็นระบบ
- **Client-side State Management & Caching:** เชี่ยวชาญการประยุกต์ใช้ TanStack Query (React Query) ในการจัดการและแคชข้อมูลของแอปพลิเคชันฝั่งหน้าบ้าน
- **Responsive Layout Design:** ทักษะการจัดโครงสร้างแบบ Mobile-First Responsive Layout และการปรับแต่งสไตล์ CSS ของแอปพลิเคชันอย่างครอบคลุม
- **Feature Planning & Feedback:** การเตรียมแผนการพัฒนาอย่างเป็นขั้นตอนผ่าน Implementation Plan และมีความรู้ความเข้าใจภาพรวมด้าน Architecture ที่ดี

## 2. Active Development (ทักษะที่กำลังฝึกฝน/ต้องพัฒนา)
- **Docker Compose Service Orchestration:** การตั้งค่าโครงข่ายและการแก้ปัญหาด้าน Service Dependency (Healthcheck, depends_on) เพื่อหลีกเลี่ยงข้อผิดพลาดในการเชื่อมต่อระหว่างคอนเทนเนอร์ (เช่น API 500 error)
- **Structured Git Workflow:** การจัดระเบียบ Branch, การเลือก Stage ไฟล์อย่างเหมาะสม และการเขียนข้อความ Commit ที่ได้มาตรฐานและเป็นระเบียบ (Atomic Commits)
- **Theme-Based State Styling:** การนำ Dynamic CSS Variables มาผสานรวมกับ React Context เพื่อพัฒนาการสลับธีมสีอย่างลื่นไหล

## 3. Knowledge Gaps (สิ่งที่ต้องเสริม)
- **Docker Network and Hostname Config:** การทำความเข้าใจโครงสร้างเน็ตเวิร์กของคอนเทนเนอร์เพื่อสลับโฮสต์ระหว่าง `localhost` และ Docker service names ได้อย่างคล่องแคล่ว
- **Natural Technical Localization:** การแปลเอกสารและเลือกใช้คำแปลภาษาไทยเฉพาะทางไอทีที่เป็นมาตรฐานและเป็นสากล (หลีกเลี่ยงการแปลตรงตัวเกินไป)

## 4. Past Lessons Learned (บทเรียนจากโปรเจกต์ก่อนหน้า)
- **"เปิดใช้งานคอนเทนเนอร์ฐานข้อมูลย่อย (Clickhouse/Redis) ให้พร้อมและตรวจสอบ Healthcheck ก่อนเริ่มทดสอบ API เสมอ"**เพื่อหลีกเลี่ยง API 500 error จาก connection ขาดหาย
- **"ใช้คำศัพท์เทคนิคทับศัพท์ที่เป็นสากลในการทำเอกสาร"** (เช่น ใช้คำว่า Pull Request หรือ Branch แทนคำแปลไทยตรงตัวที่อาจมีความหมายเพี้ยน)
- **"แยกทำงานบน Branch ฟีเจอร์ย่อยและตรวจสอบสถานะไฟล์สม่ำเสมอ"** เพื่อรักษาความสะอาดของกิ่งหลัก (`main`)

---

## **Current Context Summary (สำหรับให้ AI อ่าน)**
- **Current Project:** LottoLens (ระบบวิเคราะห์สถิติสลากกินแบ่งรัฐบาลและหวยลาวพัฒนาแบบครบวงจร)
- **Primary Goal:** เพิ่มประสิทธิภาพการแสดงผลสถิติแบบ Interactive ด้วยแผนภูมิขั้นสูงและเกลา Prompt สำหรับทำนายผลของ AI
- **Focus Skill:** Containerization (Docker) และ Version Control (Git) ในระดับการพัฒนาจริง
