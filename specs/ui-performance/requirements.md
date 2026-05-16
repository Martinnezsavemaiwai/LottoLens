# Frontend Modernization & Backend Hardening Specification (LottoThaiLens)
**บทสรุปโดย: Executive Technical Lead (CTO)**

เอกสารนี้ระบุข้อกำหนดทางเทคนิคสำหรับการปรับปรุง UI/UX และการเสริมความแข็งแกร่งของระบบ Backend เพื่อรองรับการใช้งานที่ขยายตัวและเพิ่มประสิทธิภาพความเร็ว (Core Web Vitals)

---

## 1. SPECIFICATION PATH
ไฟล์นี้ต้องถูกจัดเก็บไว้ที่: `specs/ui-performance/requirements.md`

## 2. TARGET COMPONENTS INVENTORY (Responsive Grid Refactor)
เราต้องเปลี่ยน Layout จากการใช้ Utility Class แบบคงที่ (`g2`, `g3`, `g4`) ไปเป็น Mobile-First Responsive Grid โดยใช้ระบบ Grid ของ Tailwind-compatible CSS หรือ CSS Grid ดั้งเดิม:

| Component | Current Class | Target Grid Configuration |
| :--- | :--- | :--- |
| **Analytics Overview** | `.g4.mt` | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| **Hot/Cold/Overdue Cards** | `.g3` | `grid-cols-1 md:grid-cols-3` |
| **Structural & Day Patterns** | `.g2` | `grid-cols-1 lg:grid-cols-2` |
| **AIPredict Outcome Cards** | `.g2` | `grid-cols-1 md:grid-cols-2` |
| **HistTab Grid** | `.card-grid` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |

## 3. SKELETON LOADING BLUEPRINT (Anti-Layout Shift)
แทนที่ `Loading.jsx` แบบ Full-screen ด้วย Component-level Skeletons เพื่อกำจัด Layout Shift (CLS):

- **Header Skeleton:** แสดงกรอบสีเหลี่ยมมน (Shimmer effect) แทนตำแหน่ง Prize Pills ใน `App.jsx` ขณะรอ `historyData`.
- **StatBox Skeleton:** ในหน้า `Analytics`, แสดง Shimmering Boxes แทน `.sbox` 4 ช่องแรก.
- **Positional Grid Skeleton:** ใช้ `div` เปล่าที่มีพื้นหลัง `rgba(255,255,255,0.05)` และ Shimmer animation ขนาดเท่ากับ `.pos-cell`.
- **Ball Skeleton:** แสดงวงกลม Shimmer แทน `DBall` ในส่วน Hot/Cold Digits.

## 4. TANSTACK QUERY TACTICS
ปรับเปลี่ยนการตั้งค่า `QueryClient` ใน `frontend/src/main.jsx` เพื่อเพิ่มประสิทธิภาพ Cache:

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 นาที (ข้อมูลหวยไม่เปลี่ยนบ่อย)
      gcTime: 1000 * 60 * 30,    // 30 นาที สำหรับ Garbage Collection
      retry: 2,
      refetchOnWindowFocus: false, // ป้องกันการ Fetch ซ้ำเมื่อสลับ Tab
    },
  },
});
```

## 5. BACKEND LOGGING & LIMITER TEMPLATE (Hardening)
อัปเกรด `backend/cmd/api/main.go` ให้รองรับการทำงานแบบ Enterprise:

### 5.1 Structured Logging (log/slog)
```go
import "log/slog"

logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
slog.SetDefault(logger)

// ตัวอย่างการใช้งานใน Handler
slog.Info("ai_context_request", 
    "prize_type", prizeType, 
    "ip", c.IP(),
)
```

### 5.2 Rate Limiter สำหรับ AI Context
จำกัดการเรียกใช้งาน `/api/v1/ai/context` เพื่อป้องกันการเรียก API หนักเกินไป (Resource Exhaustion):

```go
import "github.com/gofiber/fiber/v2/middleware/limiter"

api.Get("/ai/context", limiter.New(limiter.Config{
    Max:               5,               // 5 requests
    Expiration:        1 * time.Minute, // per 1 minute
    LimitReached: func(c *fiber.Ctx) error {
        return c.Status(429).JSON(fiber.Map{
            "error": "Too many AI requests. Please wait.",
        })
    },
}), aiHandler.GetContext)
```

## 6. TASK ASSIGNMENT FOR ANTIGRAVITY (Developer Instructions)
ให้ Agent ดำเนินการตามขั้นตอนต่อไปนี้บน Branch `feature/ui-perf-optimization`:

1.  **Phase 1 (Backend):**
    *   ติดตั้ง Middleware Limiter และเปลี่ยนไปใช้ `log/slog` ใน `main.go`.
    *   ทดสอบ API ด้วย `curl` เพื่อยืนยันว่า Rate Limiter ทำงาน (429 Status).
2.  **Phase 2 (Frontend Base):**
    *   อัปเดต `QueryClient` ใน `main.jsx`.
    *   สร้าง `components/ui/Skeleton.jsx` สำหรับใช้ทำ Shimmer Effect.
3.  **Phase 3 (UI Refactor):**
    *   ปรับปรุง `Analytics.jsx` ให้ใช้ Responsive Grid ตาม Inventory ในข้อ 2.
    *   นำ Skeleton ไปใช้แทนสถานะ `isLoading` ในทุก Tab.
4.  **Phase 4 (Validation):**
    *   รัน `npm run build` เพื่อตรวจสอบ Bundle Size.
    *   ตรวจสอบ Mobile Responsiveness ใน Viewport 375px ถึง 1440px.

---
**อนุมัติโดย: Executive Technical Lead**
**วันที่: 2026-05-16**
