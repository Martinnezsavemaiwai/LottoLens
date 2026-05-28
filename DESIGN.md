---
name: LottoLens
description: เครื่องมือวิเคราะห์สถิติหวยไทยและหวยลาวพัฒนา ด้วย Data Science และ AI
colors:
  bg-dark: "#0f172a"
  surface-1: "#1e293b"
  surface-2: "#334155"
  surface-3: "#475569"
  surface-4: "#64748b"
  gold-primary: "#c9952a"
  gold-bright: "#f0b429"
  gold-pale: "#ffe082"
  lao-purple: "#a78bfa"
  lao-purple-light: "#c4b5fd"
  lao-purple-pale: "#ddd6fe"
  semantic-red: "#ef4444"
  semantic-blue: "#3b82f6"
  semantic-cyan: "#06b6d4"
  semantic-green: "#22c55e"
  semantic-purple: "#8b5cf6"
  semantic-pink: "#ec4899"
  text-primary: "#f8fafc"
  text-secondary: "#cbd5e1"
  text-muted: "#94a3b8"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(16px, 3vw, 20px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "Chakra Petch, monospace"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Chakra Petch, monospace"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "1px"
  body:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Chakra Petch, monospace"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "1.5px"
rounded:
  sm: "7px"
  md: "10px"
  lg: "14px"
  full: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "28px"
components:
  button-gold:
    backgroundColor: "rgba(201,149,42,0.15)"
    textColor: "{colors.gold-bright}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-gold-hover:
    backgroundColor: "rgba(201,149,42,0.25)"
  button-blue:
    backgroundColor: "rgba(61,142,240,0.15)"
    textColor: "{colors.semantic-blue}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  chip-default:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  chip-active:
    backgroundColor: "rgba(201,149,42,0.1)"
    textColor: "{colors.gold-bright}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "9px 13px"
---

# Design System: LottoLens

## 1. Overview

**Creative North Star: "The Analyst's War Room"**

LottoLens ดูเหมือนห้องปฏิบัติการของนักวิเคราะห์ที่จริงจัง ไม่ใช่ตลาดนัดหวย ทุก pixel เซอร์วิสข้อมูล อยู่ภายใต้ dark canvas ที่ให้ความรู้สึกเหมือนนั่งดู dashboard ข้ามคืน สี gold ถูกใช้อย่างประหยัดในฐานะ accent ที่บ่งบอกถึงมูลค่าและความสำคัญ ไม่ใช่การตกแต่งเพื่อความสวยงาม

ระบบออกแบบโดยใช้ฟ้ามืด-ทอง (dark navy + gold) สำหรับ Thai mode และสลับเป็น dark navy + purple สำหรับ Lao mode ทำให้ผู้ใช้รู้สึกถึงความแตกต่างอย่างชัดเจนโดยไม่ต้องอ่านข้อความ สิ่งที่ระบบปฏิเสธอย่างชัดเจน: หวยไทย-online ที่รกด้วย banner, SaaS dashboard สีน้ำเงิน-ขาวที่ไร้บุคลิก, crypto site ที่ใช้ neon บน black และ hero-metric template แบบ SaaS

**Key Characteristics:**
- Dark-first, data-dense — ทุกอย่างรับใช้การอ่านตัวเลขในที่มืด
- Gold ใช้อย่างประหยัด ≤10% ของพื้นผิว (Restrained color strategy)
- Thai/Lao mode แยกกันด้วย accent color — gold vs. purple
- Typography 3 ชั้น: Playfair Display (logo), Chakra Petch (data), Sarabun (UI copy)
- Motion สม่ำเสมอ: ease-out-expo ทุกที่ ห้าม bounce/elastic

## 2. Colors: The Analyst's Palette

Dark navy foundation ที่ให้ความรู้สึก professional และ trustworthy สีทองใช้เป็น accent ที่บ่งบอกถึงรางวัลและความสำคัญ

### Primary (Thai Mode)
- **Burnished Gold** (`#c9952a`): Primary accent — border highlight, active states, icon stroke เท่านั้น
- **Bright Gold** (`#f0b429`): ตัวเลขหลัก หมวดที่ 1 ข้อมูลที่สำคัญที่สุด
- **Pale Gold** (`#ffe082`): Text shadow, first prize number เพื่อสร้าง glow effect

### Secondary (Lao Mode)
- **Soft Amethyst** (`#a78bfa`): Lao mode accent — ทดแทน gold ทุก instance
- **Pale Lavender** (`#c4b5fd`): Lao active states และ highlighted numbers
- **Whisper Violet** (`#ddd6fe`): Lao prize display เพื่อสร้าง depth

### Tertiary (Semantic)
- **Alert Red** (`#ef4444`): เลขล่าง, cold numbers บน dark background, error state
- **Data Blue** (`#3b82f6`): เลข back3, statistical reference color
- **Analysis Green** (`#22c55e`): เลข front3, hot numbers indicator, success state

### Neutral
- **Deep Void** (`#0f172a`): Background — canvas หลัก ไม่ใช่ pure black
- **Charcoal Layer** (`#1e293b`): Card surface — layer แรกบน background
- **Slate Panel** (`#334155`): Interactive surface, button background, input
- **Muted Stone** (`#475569`): Border active, secondary interactive
- **Fog** (`#64748b`): Border default, inactive element
- **Cloud Text** (`#f8fafc`): Primary text
- **Silver Text** (`#cbd5e1`): Secondary text
- **Ash Text** (`#94a3b8`): Muted labels, captions, timestamps

**The Frugal Gold Rule.** Gold (`#c9952a`) ปรากฏบนไม่เกิน 10% ของพื้นผิวใดก็ตาม ความหายากของมันคือจุดแข็ง ถ้า gold ปรากฏทุกที่ มันหมดความหมาย

**The Mode Signal Rule.** เมื่อ mode เปลี่ยน accent เปลี่ยนทั้งระบบ ไม่ใช่แค่สี header ผู้ใช้ต้องรู้สึกถึง Lao mode โดยไม่ต้องอ่าน label

## 3. Typography: Three Voices

**Display Font:** Playfair Display (Georgia, serif fallback)
**Data Font:** Chakra Petch (monospace fallback)
**UI Font:** Sarabun (sans-serif fallback)

**Character:** Playfair Display นำความหรูหราสำหรับ brand identity, Chakra Petch ให้ความรู้สึก technical และ precise สำหรับตัวเลข, Sarabun ทำให้ภาษาไทยอ่านง่ายและเป็นธรรมชาติสำหรับ copy ทั่วไป

### Hierarchy
- **Display** (900 weight, clamp(16px, 3vw, 20px), line-height 1): Logo เท่านั้น "THAI Lotto AI"
- **Headline** (700 weight, 26px, line-height 1.1): Big data numbers ใน stat boxes (`.sv`)
- **Title** (600 weight, 13px uppercase, letter-spacing 1px): Section headers (`.ctitle`) ใช้ Chakra Petch
- **Body** (400 weight, 13px, line-height 1.7): Disclaimer, description copy ใช้ Sarabun ทั้งหมด
- **Label** (600 weight, 10px uppercase, letter-spacing 1.5px): Column headers, stat labels — ไม่มีต่ำกว่า 10px

**The Three-Font Doctrine.** สามฟ้อนต์ สามบทบาท ห้ามสลับ: Playfair = identity, Chakra Petch = data/numbers, Sarabun = Thai copy ถ้า element ไม่ใช่ logo หรือตัวเลข ให้ใช้ Sarabun

## 4. Elevation

ระบบนี้ใช้ **tonal layering** เป็นหลัก ไม่ใช่ shadow-heavy: ความลึกเกิดจากการเปลี่ยน background shade (`--bg` → `--s1` → `--s2` → `--s3`) และ border opacity shadow ใช้เฉพาะเพื่อบ่งบอก floating state หรือ glow accent

### Shadow Vocabulary
- **Ambient** (`0 4px 20px rgba(0,0,0,0.3)`): Card resting state — diffuse ไม่มีทิศทาง
- **Gold Glow** (`0 0 20px rgba(201,149,42,0.3)`): Hover state บน gold-accented elements
- **Lao Glow** (`0 0 40px rgba(167,139,250,0.12)`): Lao mode card ambient
- **Header Overlay** (`0 1px 0 var(--bdr2), 0 4px 20px rgba(0,0,0,0.2)`): Sticky header กับ border underline

**The Glow-Not-Shadow Rule.** บน dark background ให้ใช้ glow (outward light) ไม่ใช่ drop shadow (projected darkness) shadow เหมาะกับ light mode เท่านั้น

## 5. Components

### Buttons
- **Shape:** Gently rounded corners (12px radius)
- **Gold Primary:** `rgba(201,149,42,0.15)` background, gold border `1px solid #c9952a`, gold text, padding 12px 24px
- **Hover/Focus:** `box-shadow: 0 0 20px rgba(201,149,42,0.3)` + `translateY(-1px)` ease-out-expo 250ms
- **Blue Variant:** Same pattern, blue channel — สำหรับ secondary actions
- **Red Variant:** Same pattern, red channel — สำหรับ destructive actions
- **Disabled:** `opacity: 0.35`, cursor not-allowed, no transform

### Chips / Filter Pills
- **Default:** `var(--s2)` background, `var(--bdr2)` border, `var(--txt3)` text
- **Active:** `rgba(201,149,42,0.1)` background, gold border, gold text
- **Round pills** (999px radius): ใช้สำหรับ filter selection
- **Square chips** (7px radius): ใช้สำหรับ frequency display (number + count)

### Cards
- **Corner Style:** Softly rounded (14px)
- **Background:** `var(--s1)` — หนึ่งชั้นบน background
- **Border:** `1px solid var(--bdr)` — subtle, ไม่ใช่ accent
- **Top Shimmer Line:** `::before` pseudo-element 1px gradient (transparent → gold 30% → transparent) บนสุดของทุก card
- **Internal Padding:** 20px uniform
- **Nested Cards:** ห้ามเด็ดขาด

### Inputs / Fields
- **Style:** `var(--s2)` background, `var(--bdr2)` border, 9px radius, 9px 13px padding
- **Focus:** `border-color: var(--gold)` + `box-shadow: 0 0 0 3px rgba(201,149,42,0.1)`
- **Label:** 10px uppercase, Chakra Petch, เหนือ field

### Navigation (Tab Bar)
- **Container:** Pill shape (12px radius), `rgba(255,255,255,0.03)` background, border `var(--bdr2)`
- **Tab default:** Transparent, `var(--txt3)` text, 44px min-height
- **Tab active:** `var(--s3)` background, gold text, `inset 0 0 0 1px var(--bdr)` inner border
- **Transition:** 250ms ease-out-expo

### Signature Component: Lottery Mode Switcher
Animated segmented control ด้วย sliding pill ที่ measure position จริงจาก DOM pill เลื่อนด้วย CSS `left` + `width` transition ไม่ใช่ transform เพื่อรองรับ unequal button widths Thai pill ใช้ gold gradient, Lao pill ใช้ purple gradient

### Digit Balls
Circular number display (52×52px) ด้วย radial-gradient ตาม temperature: Hot = red-to-crimson, Cold = blue-to-navy, Overdue = purple-to-violet, Warm = gold-to-amber

## 6. Do's and Don'ts

### Do:
- **Do** ใช้ `var(--accent)` แทน hard-coded color เมื่อต้องการสีที่เปลี่ยนตาม mode
- **Do** ใช้ Chakra Petch สำหรับตัวเลขและ data labels ทุกกรณี
- **Do** ใช้ Sarabun สำหรับ UI copy ภาษาไทยทุกกรณี
- **Do** เก็บ font-size ขั้นต่ำไว้ที่ 10px แม้แต่ label เล็กสุด
- **Do** ใช้ `ease-out-expo` (cubic-bezier(0.16, 1, 0.3, 1)) สำหรับทุก transition
- **Do** แยก Thai/Lao mode ด้วย accent color system — gold vs. purple ทั่วทั้ง UI
- **Do** ใช้ tonal layering (--bg → --s1 → --s2) เพื่อสร้าง depth ก่อนใช้ shadow
- **Do** ใส่ `:focus-visible` บน interactive element ทุกตัวโดยใช้ `var(--accent)` เป็น outline
- **Do** ใช้ skeleton state สำหรับ loading แทน spinner ใน content area

### Don't:
- **Don't** ใช้ `background-clip: text` กับ gradient เพื่อทำ gradient text — ห้ามเด็ดขาด ใช้ solid color แทน
- **Don't** ใช้ `border-left` หรือ `border-right` มากกว่า 1px เป็น accent stripe บน card หรือ notification ใดๆ
- **Don't** ใช้ glassmorphism (`backdrop-filter: blur()`) เป็น default decoration ใช้เฉพาะ sticky overlay ที่จำเป็น
- **Don't** ใช้สีเว็บหวยไทยทั่วไป — ห้าม banner สีสด, ห้ามตัวเลขฉูดฉาด, ห้ามโทนสีแดง-ทอง-ดำแบบสำนักพิมพ์เก่า
- **Don't** สร้าง hero-metric template (big number + small label + gradient accent) ซึ่งเป็น SaaS cliché
- **Don't** ใช้ card grids ที่เหมือนกันทุก cell — content ต้องมี visual variety
- **Don't** ใช้ `#000` หรือ `#fff` ล้วนๆ — ทุก neutral ต้องมี hue tint
- **Don't** ใช้ bounce หรือ elastic easing (`cubic-bezier` ที่มี overshoot) — ใช้ ease-out เท่านั้น
- **Don't** nested cards — ห้ามวาง card ซ้อนภายใน card อื่น
- **Don't** ทำ modal เป็น first thought — ใช้ inline / progressive disclosure ก่อนเสมอ
- **Don't** ใช้ crypto-style neon on black หรือ SaaS navy-white ซึ่งเป็น anti-reference ของโปรเจกต์นี้
