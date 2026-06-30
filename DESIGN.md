---
name: LottoLens
description: เครื่องมือวิเคราะห์สถิติหวยไทยและหวยลาวพัฒนา ด้วย Data Science และ AI
theme: Mocha Mousse Luxury — The Mindful Analyst

colors:
  surface:                  '#fbf9f4'
  surface-bright:           '#fbf9f4'
  surface-dim:              '#dcdad5'
  surface-container-lowest: '#ffffff'
  surface-container-low:    '#f5f3ee'
  surface-container:        '#f0eee9'
  surface-container-high:   '#eae8e3'
  surface-container-highest:'#e4e2dd'
  surface-canvas:           '#f0eee9'
  surface-card:             '#fbf9f4'
  surface-variant:          '#e4e2dd'
  on-surface:               '#1b1c19'
  on-surface-variant:       '#51443f'
  inverse-surface:          '#30312d'
  inverse-on-surface:       '#f3f1eb'
  on-background:            '#1b1c19'
  background:               '#fbf9f4'
  outline:                  '#83746e'
  outline-variant:          '#d5c3bc'
  outline-warm:             '#83746e'
  surface-tint:             '#7d5543'
  glass-overlay:            'rgba(217, 212, 199, 0.3)'
  primary:                  '#7a5341'
  primary-bright:           '#a47864'
  primary-deep:             '#5f3c2b'
  on-primary:               '#ffffff'
  primary-container:        '#956b57'
  on-primary-container:     '#fffbff'
  primary-fixed:            '#ffdbcc'
  primary-fixed-dim:        '#efbba5'
  on-primary-fixed:         '#2f1406'
  on-primary-fixed-variant: '#623e2d'
  inverse-primary:          '#efbba5'
  lao-accent:               '#a78bfa'
  lao-accent-light:         '#c4b5fd'
  lao-accent-pale:          '#ddd6fe'
  secondary:                '#6b5c45'
  on-secondary:             '#ffffff'
  secondary-container:      '#f2ddbf'
  on-secondary-container:   '#706049'
  secondary-fixed:          '#f5dfc2'
  secondary-fixed-dim:      '#d8c4a7'
  on-secondary-fixed:       '#241a08'
  on-secondary-fixed-variant: '#52452f'
  tertiary:                 '#5f5c52'
  on-tertiary:              '#ffffff'
  tertiary-container:       '#78746a'
  on-tertiary-container:    '#fffbff'
  tertiary-fixed:           '#e7e2d5'
  tertiary-fixed-dim:       '#cbc6b9'
  on-tertiary-fixed:        '#1d1c14'
  on-tertiary-fixed-variant: '#49473d'
  semantic-red:             '#ef4444'
  semantic-blue:            '#3b82f6'
  semantic-green:           '#22c55e'
  semantic-purple:          '#8b5cf6'
  error:                    '#ba1a1a'
  on-error:                 '#ffffff'
  error-container:          '#ffdad6'
  on-error-container:       '#93000a'

typography:
  display-lg:
    fontFamily: 'Playfair Display, Georgia, serif'
    fontSize: '48px'
    fontWeight: '300'
    lineHeight: '1.2'
    letterSpacing: '0.04em'
  display-md:
    fontFamily: 'Playfair Display, Georgia, serif'
    fontSize: '36px'
    fontWeight: '300'
    lineHeight: '1.2'
    letterSpacing: '0.02em'
  headline-lg:
    fontFamily: 'Playfair Display, Georgia, serif'
    fontSize: '30px'
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: 'DM Sans, Sarabun, sans-serif'
    fontSize: '18px'
    fontWeight: '300'
    lineHeight: '1.8'
    letterSpacing: '0.01em'
  body-md:
    fontFamily: 'DM Sans, Sarabun, sans-serif'
    fontSize: '16px'
    fontWeight: '300'
    lineHeight: '1.7'
  label-sm:
    fontFamily: 'DM Sans, sans-serif'
    fontSize: '12px'
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0.08em'
  display-lg-mobile:
    fontFamily: 'Playfair Display, Georgia, serif'
    fontSize: '32px'
    fontWeight: '300'
    lineHeight: '1.2'

spacing:
  unit:             '8px'
  gutter:           '32px'
  margin-desktop:   '64px'
  margin-mobile:    '24px'
  section-gap:      '128px'
  container-max:    '1200px'

rounded:
  sharp:   '0px'
  sm:      '2px'
  lg:      '4px'
  pill:    '9999px'

components:
  button-primary:
    shape: pill
    backgroundColor: '#7a5341'
    textColor: '#ffffff'
    padding: '12px 32px'
    fontFamily: label-sm
    transition: '500ms ease-out-expo'
    hover:
      backgroundColor: '#623e2d'
      transform: 'scale(0.98)'
  button-outline:
    shape: pill
    backgroundColor: 'transparent'
    border: '1px solid #83746e'
    textColor: '#1b1c19'
    padding: '10px 28px'
    transition: '500ms ease-out-expo'
    hover:
      backgroundColor: '#eae8e3'
  input:
    style: understated
    backgroundColor: 'transparent'
    borderBottom: '1px solid #83746e'
    textColor: '#1b1c19'
    padding: '8px 0'
    focus:
      borderBottomWidth: '2px'
      borderBottomColor: '#7a5341'
  range-slider:
    trackHeight: '1px'
    trackColor: '#83746e'
    thumbSize: '12px'
    thumbColor: '#a47864'
    thumbHover: 'scale(1.5)'
  card:
    shape: sharp
    backgroundColor: '#fbf9f4'
    border: '1px solid #d5c3bc'
    padding: '40px'
    shadow: '0 20px 40px rgba(58, 46, 34, 0.04)'
    hover:
      transform: 'translateY(-4px)'
      transition: '600ms ease-out-expo'
  chip-track:
    backgroundColor: '#eae8e3'
    shape: pill
    padding: '4px'
  chip-default:
    backgroundColor: 'transparent'
    textColor: '#51443f'
    padding: '6px 16px'
    shape: pill
    transition: '500ms ease-out-expo'
  chip-active:
    backgroundColor: '#7a5341'
    textColor: '#ffffff'
    padding: '6px 16px'
    shape: pill
  nav-tab-default:
    textColor: '#51443f'
    fontFamily: label-sm
    fontWeight: '300'
    letterSpacing: '0.1em'
    textTransform: uppercase
    transition: '500ms ease-out-expo'
  nav-tab-active:
    textColor: '#7a5341'
    borderBottom: '1px solid #7a5341'
    fontWeight: '500'
  mode-switcher:
    container:
      backgroundColor: '#f0eee9'
      shape: pill
      padding: '4px'
    pill-thai:
      backgroundColor: '#7a5341'
      textColor: '#ffffff'
      shape: pill
    pill-lao:
      backgroundColor: '#a78bfa'
      textColor: '#ffffff'
      shape: pill
    transition: 'left 400ms ease-out-expo, width 400ms ease-out-expo'
  digit-ball:
    size: '56px'
    shape: circular
    background: '#f0eee9'
    border: '1px solid #d5c3bc'
    transition: '600ms ease-out-expo'
    hover: 'translateY(-8px)'
    hot-bg:     'radial-gradient(circle, #ef4444, #991b1b)'
    cold-bg:    'radial-gradient(circle, #3b82f6, #1e3a8a)'
    overdue-bg: 'radial-gradient(circle, #8b5cf6, #5b21b6)'
    warm-bg:    'radial-gradient(circle, #a47864, #5f3c2b)'
  table:
    headerFont: label-sm
    headerTextColor: '#51443f'
    borderStyle: none-vertical
    rowBorder: '1px solid #e4e2dd'
    rowHover:
      backgroundColor: '#f5f3ee'
  modal:
    backdrop: 'rgba(30, 28, 25, 0.6)'
    container:
      shape: sharp
      backgroundColor: '#fbf9f4'
      border: '1px solid #d5c3bc'
  skeleton:
    baseColor: '#f0eee9'
    shimmerColor: '#eae8e3'
    animation: 'shimmer 1.6s ease-out-expo infinite'
  toast-success:
    backgroundColor: '#fbf9f4'
    border: '1px solid #d5c3bc'
    indicator: '#22c55e'
  toast-error:
    backgroundColor: '#fbf9f4'
    border: '1px solid #d5c3bc'
    indicator: '#ba1a1a'
---

# Design System: LottoLens

## 1. Overview

**Creative North Star: "The Mindful Analyst"**

LottoLens มีบุคลิกเป็นนักวิเคราะห์ผู้มีรสนิยม — มืออาชีพที่ทำงานกับข้อมูลอย่างมีสติและจริงจัง ไม่ใช่เว็บหวยไทยทั่วไป Interface ให้ความรู้สึกเหมือนห้องทำงานส่วนตัวของนักวิเคราะห์ระดับสูง มีความสงบ แม่นยำ และน่าเชื่อถือ ภายใต้ palette สีโทน "Cloud Dancer" — warm off-white ที่ให้ความรู้สึกเหมือนกระดาษหนังสือพิมพ์ระดับ Premium

**วิวัฒนาการจาก Design เดิม:**
- จาก "Dark Navy War Room" → สู่ "Cloud Dancer Luxury" (Light-first)
- จาก Chakra Petch (Technical Mono) → สู่ Playfair Display + DM Sans (Editorial Luxury)
- จาก Dark Glow Effects → สู่ Ambient Luxury Shadows
- Cards: Sharp corners (0px) แทน Softly Rounded
- Buttons: Pill-shaped เพื่อสร้าง contrast กับ structural containers ที่เป็น sharp

**Key Characteristics:**
- **Light-first, editorial** — warm off-white canvas ที่ให้ความรู้สึก premium stationery
- **Clay Primary ≤10% rule** — `#7a5341` ใช้อย่างประหยัดเหมือน accent gold เดิม
- **Thai/Lao mode** แยกด้วย Clay vs. Amethyst ทั่วทั้งระบบ
- **Typography 2 ชั้น:** Playfair Display (Identity/Headlines), DM Sans (Functional/Thai copy)
- **Motion:** ease-out-expo ทุกที่ ห้าม bounce/elastic

---

## 2. Colors: The Mindful Analyst's Palette

### Primary: The Analyst's Clay (Thai Mode)
- **`#7a5341` (Primary — Roasted Clay):** Primary CTA, active states, nav active underline, primary borders — ≤10% of any surface
- **`#a47864` (Primary Bright):** Hover states, slider thumbs, chart nodes
- **`#5f3c2b` (Primary Deep):** Pressed/active dark variant

### Lao Mode Accent: Soft Amethyst
เมื่อ mode เปลี่ยนเป็นหวยลาว ระบบ accent เปลี่ยนทั้งหมด ผู้ใช้ต้องรู้สึกถึงการเปลี่ยน mode โดยไม่ต้องอ่าน label:
- **`#a78bfa` (Lao Accent):** ทดแทน Primary Clay ทุก instance
- **`#c4b5fd` (Lao Accent Light):** Hover / highlighted numbers
- **`#ddd6fe` (Lao Accent Pale):** Depth layering

### Neutral (Cloud Dancer Base)
ระบบหลีกเลี่ยง pure white `#ffffff` ทุกกรณี ทุก neutral ต้องมี warm hue:
- **`#fbf9f4`** — Canvas base / card surface
- **`#f5f3ee`** — Low container
- **`#f0eee9`** — Main container surface (Page background)
- **`#eae8e3`** — High container / interactive hover
- **`#e4e2dd`** — Highest / selected rows
- **`#dcdad5`** — Dim surface
- **`#d5c3bc`** — Subtle separator / table row border

### Text Hierarchy
- **`#1b1c19`** — Primary text (warm near-black)
- **`#51443f`** — Secondary / muted / captions
- **`#83746e`** — Outline / border (warm grey)

### Semantic Colors (Functional)
สีเหล่านี้ใช้เฉพาะเพื่อ data visualization ไม่ใช่ UI decoration:
- **`#ef4444`** — Hot numbers (Alert Red)
- **`#3b82f6`** — Reference / back3 data (Data Blue)
- **`#22c55e`** — Hot indicator / Success (Analysis Green)
- **`#8b5cf6`** — Overdue numbers (Deep Violet)
- **`#ba1a1a`** — Error state (System Red)

**The Frugal Clay Rule:** Primary `#7a5341` ปรากฏบนไม่เกิน **10%** ของพื้นผิวใดก็ตาม ความหายากของ accent คือจุดแข็ง

**The Mode Signal Rule:** เมื่อ mode เปลี่ยน accent เปลี่ยนทั้งระบบ — ไม่ใช่แค่สี header

---

## 3. Typography: Two Voices, One Editorial Standard

**Display / Headline Font:** `Playfair Display` (Georgia, serif fallback)
ใช้สำหรับ: Logo brand identity, page hero titles, card headline titles
น้ำหนักที่แนะนำ: **300 (Light)** หรือ Italic เพื่อความ Elegant

**Body / Functional Font:** `DM Sans` (Sarabun, sans-serif fallback สำหรับภาษาไทย)
ใช้สำหรับ: ทุก UI copy ภาษาไทย, data labels, captions, navigation items
น้ำหนักที่แนะนำ: **300 (Light)** เป็น default สำหรับ body copy

### Type Scale & Hierarchy

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Display LG | Playfair Display | 48px | 300 | Hero sections |
| Display MD | Playfair Display | 36px | 300 | Page titles, Backtest |
| Headline LG | Playfair Display | 30px | 400 | Card titles, Sections |
| Body LG | DM Sans | 18px | 300 | Descriptions |
| Body MD | DM Sans | 16px | 300 | Default body copy |
| Label SM | DM Sans | 12px | 500 | Uppercase labels, stats headers |

**The Two-Font Doctrine:**
- Playfair = Identity + Headlines (Logo, section titles, big data numbers)
- DM Sans = Functional (ทุกอย่างที่เหลือ — ภาษาไทยทั้งหมด, nav, labels, captions)

**Label Rule:** Label SM ใช้ `letter-spacing: 0.08em` + uppercase เสมอ เพื่อสร้าง "cataloged data" feeling

---

## 4. Layout & Spacing

### Grid System
- **Max Width:** 1200px centered
- **Desktop Margin:** 64px side padding
- **Mobile Margin:** 24px side padding
- **Gutter:** 32px column gap
- **Base Unit:** 8px (ทุก spacing เป็น multiple ของ 8)

### Section Rhythm
- **Section Gap:** 128px ระหว่าง major sections (ชะลอจังหวะการอ่าน — ให้เวลาประมวลผล)
- Mobile: Section gap ลดเหลือ 64px

### Bento Grid System
Analytics page ใช้ Bento Grid layout:
- Desktop: `grid-cols-12` โดย Control Panel ใช้ 4 cols, Main Output ใช้ 8 cols
- Mobile: Single column stack

---

## 5. Elevation & Depth

### Luxury Ambient Shadow (หลัก)
```css
box-shadow: 0 20px 40px rgba(58, 46, 34, 0.04);
```
- Blur radius กว้างมาก (40px) ทำให้ card ลอยเหนือ surface อย่างละเอียดอ่อน
- Opacity ต่ำมาก (4%) เพื่อให้รู้สึก clean

### Glassmorphism (Secondary — ใช้เฉพาะ)
```css
backdrop-filter: blur(10px);
background: rgba(217, 212, 199, 0.3);
```
ใช้เฉพาะ: Modal backdrop, sticky header overlay

### Borders (Structural)
1px borders `#d5c3bc` ใช้แทน shadow สำหรับ structural boundaries เช่น table rows และ nav bars

**The Ambient-Not-Hard Rule:** บน light background ห้ามใช้ sharp drop shadow ให้ใช้ ambient luxury shadow เท่านั้น

---

## 6. Shapes

| Element | Shape | Radius | Purpose |
|---------|-------|--------|---------|
| Cards, Containers, Modals, Tables | Sharp | 0px | Serious / Editorial / Architectural |
| Buttons (CTA) | Pill | 9999px | Clear interactive cue |
| Mode Switcher | Pill | 9999px | Signature animated component |
| Filter Chips | Pill | 9999px | Selection affordance |
| Status Badges | Pill | 9999px | Compact label |
| Chart Data Points | Circle | 50% | Soften data visualization |
| Digit Balls | Circle | 50% | Number display |

---

## 7. Components

### Buttons
- **Primary (Pill):** Solid `#7a5341`, white text, `padding: 12px 32px`
- **Outline (Pill):** Transparent, 1px border `#83746e`, on-surface text
- **Transition:** 500ms ease-out-expo
- **Hover:** Darken → `#623e2d` + scale down `0.98` (press feel)
- **Disabled:** `opacity: 0.35`, cursor not-allowed

### Input Fields (Understated Style)
- **Default:** No box — only 1px bottom border `#83746e`
- **Focus:** 2px bottom border, color → `#7a5341`
- **Label:** 12px, DM Sans, uppercase, letter-spacing 0.08em, positioned above field
- **Range Slider:** 1px track, 12px pill thumb `#a47864`, hover: scale 1.5x

### Cards (Bento Grid)
- **Shape:** Sharp (0px radius)
- **Background:** `#fbf9f4`
- **Border:** `1px solid #d5c3bc`
- **Shadow:** `0 20px 40px rgba(58, 46, 34, 0.04)`
- **Hover:** `translateY(-4px)` ease-out-expo 600ms
- **Internal Padding:** 40px uniform (generous)
- **ห้าม nested cards** — ห้ามวาง card ซ้อนภายใน card อื่นเด็ดขาด

### Chips / Filter Pills
- **Track:** `#eae8e3` background, pill-shaped container
- **Default:** Transparent background, `#51443f` text
- **Active (Thai):** Solid `#7a5341` background, white text
- **Active (Lao):** Solid `#a78bfa` background, white text
- Sliding pill animation via CSS `left` + `width` transition

### Navigation (Tab Bar)
- **Default:** `#51443f` text, light weight, uppercase, letter-spacing 0.1em
- **Active:** `#7a5341` text + 1px underline
- **Transition:** 500ms ease-out-expo
- **Min-height:** 44px เพื่อ Touch Target accessibility

### Signature Component: Lottery Mode Switcher
Animated segmented control ด้วย sliding pill:
- Measures DOM position จริง (ไม่ hardcode position)
- Thai pill: Clay primary `#7a5341`
- Lao pill: Amethyst `#a78bfa`
- Transition: `left 400ms ease-out-expo, width 400ms ease-out-expo`

### Digit Balls (Temperature Display)
วงกลม 56×56px แสดงตัวเลขพร้อม temperature gradient:
- **Hot (ออกบ่อย):** `radial-gradient(circle, #ef4444, #991b1b)` + white text
- **Cold (ออกน้อย):** `radial-gradient(circle, #3b82f6, #1e3a8a)` + white text
- **Overdue (นานมากแล้ว):** `radial-gradient(circle, #8b5cf6, #5b21b6)` + white text
- **Normal:** `#f0eee9` background + `#1b1c19` text + `#d5c3bc` border
- Hover: `translateY(-8px)` ease-out-expo

### Tables (Minimalist)
- ไม่มี vertical borders
- Header: Label SM, `#51443f` color, uppercase
- Row separator: `1px solid #e4e2dd`
- Row hover: `#f5f3ee` background shift
- Pagination: 10 rows/page (History), 20 rows/page (Frequency)

### Auth Modal
- Backdrop: `rgba(30, 28, 25, 0.6)` blur
- Container: Sharp (0px), `#fbf9f4` background, `1px solid #d5c3bc` border
- ห้ามใช้ Modal เป็น first thought — prefer inline/progressive disclosure

### Skeleton Loading
ใช้ skeleton แทน spinner ใน content area ทุกกรณี:
- Base: `#f0eee9`, Shimmer: `#eae8e3`
- Animation: shimmer sweep 1.6s ease-out-expo infinite

---

## 8. Motion

**Universal Easing:** `cubic-bezier(0.19, 1, 0.22, 1)` (ease-out-expo) สำหรับทุก transition
- ห้ามใช้ bounce / elastic / overshoot easing
- Duration targets:
  - Labels / Colors: 250ms
  - Buttons / Chips: 500ms
  - Cards / Sections: 600ms

**Fade-In on Scroll:**
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
ใช้กับ sections หลักๆ ด้วย `animation-delay` stagger ทีละ 0.1s

**Motion Accessibility:**
- รองรับ `prefers-reduced-motion` — ปิด animation ทั้งหมดเมื่อ user ร้องขอ
- `@media (prefers-reduced-motion: reduce) { animation: none; }`

---

## 9. Do's and Don'ts

### ✅ Do:
- **Do** ใช้ `var(--accent)` / `var(--primary)` แทน hard-coded color เมื่อต้องการสีที่เปลี่ยนตาม mode
- **Do** ใช้ Playfair Display สำหรับ Logo, Card titles, และ Page section headings
- **Do** ใช้ DM Sans สำหรับ UI copy ภาษาไทยทุกกรณี รวมถึง captions, labels, nav items
- **Do** เก็บ font-size ขั้นต่ำไว้ที่ **12px** แม้แต่ label เล็กสุด
- **Do** ใช้ `ease-out-expo` (cubic-bezier(0.19, 1, 0.22, 1)) สำหรับทุก transition
- **Do** แยก Thai/Lao mode ด้วย Clay vs. Amethyst ทั่วทั้งระบบ ไม่ใช่แค่ header
- **Do** ใช้ Tonal Layering (`surface` → `surface-container` → `surface-container-high`) เพื่อสร้าง depth
- **Do** ใส่ `:focus-visible` บน interactive element ทุกตัวโดยใช้ `var(--primary)` เป็น outline
- **Do** ใช้ skeleton state สำหรับ loading แทน spinner ใน content area
- **Do** ให้ Buttons มี shape pill (`border-radius: 9999px`) เสมอ เพื่อ contrast กับ containers ที่เป็น sharp
- **Do** ให้ Cards มี shape sharp (0px radius) เสมอ
- **Do** ใช้ generous section gap (128px) ระหว่าง major sections
- **Do** ใช้ uppercase + letter-spacing 0.08em สำหรับ data labels ทุกตัว

### ❌ Don't:
- **Don't** ใช้ pure `#ffffff` หรือ `#000000` — ทุก neutral ต้องมี warm hue tint
- **Don't** ใช้สีเว็บหวยไทยทั่วไป — ห้าม banner สีสด, ห้ามตัวเลขฉูดฉาด, ห้ามโทนสีแดง-ทอง-ดำแบบสำนักพิมพ์เก่า
- **Don't** สร้าง hero-metric template (big number + small label + gradient accent) ซึ่งเป็น SaaS cliché
- **Don't** ใช้ card grids ที่เหมือนกันทุก cell — content ต้องมี visual variety
- **Don't** ใช้ bounce หรือ elastic easing — ใช้ ease-out เท่านั้น
- **Don't** nested cards — ห้ามวาง card ซ้อนภายใน card อื่น
- **Don't** ทำ modal เป็น first thought — ใช้ inline / progressive disclosure ก่อนเสมอ
- **Don't** ใช้ `background-clip: text` กับ gradient text — ใช้ solid color แทนเสมอ
- **Don't** ใช้ glassmorphism เป็น default decoration — ใช้เฉพาะ sticky overlay ที่จำเป็น
- **Don't** ใช้ crypto-style neon on dark หรือ SaaS navy-white ซึ่งเป็น anti-reference ของโปรเจกต์
- **Don't** ใช้ rounded cards — ทุก container ต้องเป็น sharp (0px) เท่านั้น
- **Don't** ใช้ hard drop shadow บน light background — ใช้ ambient luxury shadow แทน
- **Don't** ใช้ font ต่ำกว่า 12px แม้แต่ timestamp หรือ footnote

---

## 10. CSS Variable Mapping

ตัวแปร CSS ที่ใช้ใน codebase ต้องแมปไปยังค่าใหม่ดังนี้:

```css
:root {
  /* Surfaces */
  --bg:   #f0eee9;  /* Page background */
  --s1:   #fbf9f4;  /* Card surface */
  --s2:   #eae8e3;  /* Interactive / input */
  --s3:   #e4e2dd;  /* Selected / highest */

  /* Text */
  --txt:  #1b1c19;
  --txt2: #51443f;
  --txt3: #83746e;

  /* Borders */
  --bdr:  #d5c3bc;
  --bdr2: #83746e;

  /* Thai Mode Accent */
  --accent:  #7a5341;
  --accent2: #a47864;
  --gold:    #7a5341;  /* remapped — ชื่อ variable เดิมที่ใช้ใน codebase */

  /* Lao Mode Accent */
  --lao-accent:  #a78bfa;
  --lao-accent2: #c4b5fd;

  /* Semantic */
  --red:    #ef4444;
  --blue:   #3b82f6;
  --green:  #22c55e;
  --purple: #8b5cf6;
}

/* Lao mode override */
.mode-lao {
  --accent:  #a78bfa;
  --accent2: #c4b5fd;
  --gold:    #a78bfa;
}
```

---

## 11. Accessibility & Inclusion

- **ภาษาหลัก:** ภาษาไทย (UI copy ทั้งหมด) — ใช้ DM Sans + Sarabun fallback เสมอ
- **WCAG AA:** เป้าหมาย contrast ratio ≥ 4.5:1 สำหรับ normal text
- **Keyboard navigation:** ทุก interactive element ต้อง focusable ด้วย Tab
- **Screen reader:** ใช้ `aria-label`, `aria-current`, `role` attributes ที่เหมาะสม
- **Touch targets:** ขั้นต่ำ 44×44px สำหรับทุก interactive element
- **Font size ขั้นต่ำ:** 12px (Label SM) — ไม่มีข้อยกเว้น
- **`prefers-reduced-motion`:** ปิด animation ทั้งหมดหากผู้ใช้ร้องขอ
- **Light/Dark mode toggle:** ผู้ใช้เลือกได้เอง (ปุ่มอยู่ใน Header เสมอ)
