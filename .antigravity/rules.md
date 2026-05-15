# 🤖 Agent Rules: Thai Lotto AI

## Framework & Stack
- **Framework:** React + Vite
- **Styling:** Plain CSS — อ้างอิงจาก `src/config/theme.css` **เท่านั้น** ห้ามเพิ่ม inline style ที่ซ้ำซ้อน
- **AI Service:** `src/services/gemini.js` — ห้ามใช้ `callClaude` หรือ Anthropic API

## Theme / Design System
- สไตล์: **"Thai Royal Gold × Obsidian luxury"**
- สีพื้นหลัง: `var(--bg)` (#07080d)
- สีทอง: `var(--gold)` (#c9952a), `var(--gold2)` (#f0b429), `var(--gold3)` (#ffe082)
- ฟอนต์:
  - `'Sarabun'` — ข้อความทั่วไป
  - `'Chakra Petch'` — ตัวเลขและ label
  - `'Playfair Display'` — Header หลัก

## Coding Rules
1. **ห้ามลบ** Noise texture overlay (`body::before`) ใน `theme.css`
2. **แยก Component ย่อยเสมอ** — ห้ามไฟล์เดียวยาวเกิน 300 บรรทัด
3. **สถิติ** ต้องเรียกจาก `src/utils/mathEngine.js` เท่านั้น — ห้ามเขียน Logic ซ้ำใน UI
4. **Helpers** เรียกจาก `src/utils/helpers.js`
5. **ข้อมูลหวย** นำเข้าจาก `src/data/history.js`
6. Tab ใหม่ทุกอัน → สร้างที่ `src/components/tabs/`
7. UI component ขนาดเล็ก (reusable) → สร้างที่ `src/components/ui/`

## File Structure
```
src/
├── config/theme.css      ← Design system (ห้ามแก้ไขโดยไม่จำเป็น)
├── data/history.js       ← RAW data + HISTORY array
├── services/gemini.js    ← AI API layer
├── utils/
│   ├── mathEngine.js     ← getStats, buildMathContext
│   └── helpers.js        ← fmtTH, getNextDraw, parseJson, CTip, DBall
├── components/
│   ├── tabs/             ← Tab-level components
│   └── ui/               ← Reusable UI atoms
├── App.jsx               ← Layout + Navigation only
└── main.jsx              ← Entry point
```
