---
doc_id: "KNOWLEDGE-DESIGN-GUIDE"
status: "Active"
owner: "Vibe Coder (ssuladze@exadel.com)"
applies_to: ["EPIC-006", "admin/"]
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# ClearGate Design Guide

Visual-language reference for the Admin UI ([EPIC-006](../work-items/epics/EPIC-006_Admin_UI.md)). This file is the authoritative source for color, typography, spacing, radius, elevation, and component patterns. Inspired by a warm, cream-backgrounded dashboard aesthetic — soft, premium, bento-style — not the stock DaisyUI `corporate` theme.

When implementing admin/ components, treat this guide as ground truth. If a story or epic references "the design guide," it means this file.

---

## 1. Visual Principles

- **Warm over cold.** Off-white, cream backgrounds. Avoid pure `#FFFFFF` page backgrounds — cards are white, the canvas is warm.
- **Bento, not grid.** Asymmetric card layouts. Cards breathe. Large radius (20-24px). Content density is intentionally low.
- **Soft elevation.** Cards separate from canvas via subtle shadow, not borders. Borders only where needed for inputs.
- **Monochrome + one hero accent.** Near-black text on cream; terracotta-orange is the single hero color. A muted slate-blue plays a quiet supporting role.
- **Rounded, friendly geometry.** Pills for tags, circles for icon buttons and avatars, large rounded cards. Nothing sharp.
- **Content-first type.** Big confident headings, generous whitespace, quiet metadata.

---

## 2. Color Tokens

### 2.1 Palette (hex)

| Token | Hex | Use |
|---|---|---|
| `--cg-canvas` | `#F4F1EC` | Page background (cream) |
| `--cg-surface` | `#FFFFFF` | Card / modal / input surface |
| `--cg-surface-muted` | `#F7F5F1` | Nested panels, hover rows |
| `--cg-ink` | `#1A1F2E` | Primary text, dark pills, value chips |
| `--cg-ink-soft` | `#4B5363` | Headings on muted surfaces |
| `--cg-muted` | `#6B7280` | Body secondary text |
| `--cg-subtle` | `#9CA3AF` | Meta, captions, placeholders |
| `--cg-line` | `#ECE8E1` | Input borders, table dividers (very low contrast) |
| `--cg-primary` | `#E85C2F` | Hero accent — CTAs, logo, primary chart series, active nav |
| `--cg-primary-soft` | `#FBE4D9` | Primary tag background, hover wash |
| `--cg-secondary` | `#7BA4D4` | Supporting accent — secondary chart series, "Middle" badge |
| `--cg-secondary-soft` | `#DEE8F4` | Secondary tag background |
| `--cg-success` | `#2F9E6B` | Positive deltas, success toasts |
| `--cg-warning` | `#D89B2B` | Warning toasts, rate-limit hints |
| `--cg-danger` | `#C23A3A` | Error toasts, destructive confirms |

### 2.2 DaisyUI theme (`cleargate`)

Register a custom DaisyUI v5 theme in `admin/src/app.css`. This replaces the `corporate` theme referenced in pre-design-guide drafts.

```css
@import "tailwindcss";
@plugin "daisyui" {
  themes:
    cleargate --default;
}

@plugin "daisyui/theme" {
  name: "cleargate";
  default: true;
  color-scheme: light;
  --color-base-100: #FFFFFF;       /* surface */
  --color-base-200: #F7F5F1;       /* surface-muted */
  --color-base-300: #F4F1EC;       /* canvas */
  --color-base-content: #1A1F2E;   /* ink */
  --color-primary: #E85C2F;
  --color-primary-content: #FFFFFF;
  --color-secondary: #7BA4D4;
  --color-secondary-content: #FFFFFF;
  --color-accent: #1A1F2E;         /* dark pills (value chips, primary buttons) */
  --color-accent-content: #FFFFFF;
  --color-neutral: #1A1F2E;
  --color-neutral-content: #FFFFFF;
  --color-info: #7BA4D4;
  --color-success: #2F9E6B;
  --color-warning: #D89B2B;
  --color-error: #C23A3A;
  --radius-selector: 9999px;       /* pills */
  --radius-field: 0.75rem;         /* inputs, small buttons */
  --radius-box: 1.5rem;            /* cards */
  --border: 1px;
  --depth: 0;
  --noise: 0;
}

html, body { background: var(--color-base-300); }
```

### 2.3 Dark mode

Out of scope for v1 (per EPIC-006 §2). Tokens above are light-only. When dark mode lands in v1.1, introduce a parallel `cleargate-dark` theme — do not monkey-patch these.

---

## 3. Typography

**Font stack:** Inter (primary), system-ui fallback. Self-host via `@fontsource-variable/inter` to avoid Google Fonts runtime fetch.

```css
font-family: "Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
```

**Scale** (Tailwind class → px → use):

| Class | Size | Weight | Use |
|---|---|---|---|
| `text-4xl` | 36px | 700 | Display numbers ("+20%"), page hero values |
| `text-3xl` | 30px | 700 | Card titles ("Income Tracker") |
| `text-xl` | 20px | 600 | Section headings ("Your Recent Projects") |
| `text-base` | 16px | 500 | Card subtitle, list item title |
| `text-sm` | 14px | 400 | Body, table cells |
| `text-xs` | 12px | 500 | Meta (location, time-ago), badge text |

**Rules:**
- Line-height: `leading-tight` for display, `leading-normal` for body.
- Letter-spacing: default. Never tracking-wide on body.
- Numbers: tabular-nums on tables and stat cards (`font-variant-numeric: tabular-nums`).

---

## 4. Spacing & Radius

**Spacing scale:** Tailwind default (4px base). Prefer these:

| Token | px | Use |
|---|---|---|
| `p-2` | 8 | Compact pill padding |
| `p-4` | 16 | Input, small button |
| `p-6` | 24 | Card inner padding (default) |
| `p-8` | 32 | Large card inner padding |
| `gap-4` | 16 | Intra-card elements |
| `gap-6` | 24 | Grid gutter between cards |

**Radius scale:**

| Token | px | Use |
|---|---|---|
| `rounded-full` | ∞ | Pills, tags, avatars, icon buttons |
| `rounded-xl` | 12 | Inputs, small buttons |
| `rounded-2xl` | 16 | Nested panels, modals |
| `rounded-3xl` | 24 | Cards (default) |

---

## 5. Elevation

One shadow. Do not invent more.

```css
--cg-shadow-card: 0 1px 2px rgba(26, 31, 46, 0.04),
                  0 4px 16px rgba(26, 31, 46, 0.04);
```

Tailwind equivalent: define as `shadow-card` in `tailwind.config`. Do not use `shadow-md`, `shadow-lg`, etc. — they read too heavy on cream.

Modals use the same shadow plus a `rgba(26,31,46,0.32)` backdrop.

---

## 6. Components

### 6.1 Card (the primary building block)

```
bg-base-100  rounded-3xl  shadow-card  p-6
```

- Title: `text-3xl font-bold` (hero cards) or `text-xl font-semibold` (list cards).
- Optional leading icon: 40px squircle, `bg-primary/10` or `bg-secondary/10`, primary/secondary colored glyph inside.
- Card header should include an action (dropdown, "See all" link) right-aligned when relevant.

### 6.2 Pill / Tag

- Neutral tag: `rounded-full bg-base-200 text-ink-soft text-xs px-3 py-1`.
- Role/status tag (filled): `rounded-full bg-primary text-primary-content text-xs px-2.5 py-0.5 font-semibold`. Variants use `bg-secondary`, `bg-accent`.
- Use tags for: role labels (Senior/Middle), work type (Remote/Part-time), paid status. Max 2 tags per item.

### 6.3 Value chip (dark stat)

For highlighted numeric values (e.g., "$2,567" on the chart peak):

```
rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1
```

### 6.4 Buttons

| Variant | Classes | Use |
|---|---|---|
| Primary | `btn btn-primary rounded-full` | Submit, confirm, "Upgrade now" style CTA |
| Dark | `btn bg-accent text-accent-content rounded-full` | Dark pill CTA matching value chips |
| Ghost | `btn btn-ghost rounded-full` | Secondary actions |
| Danger | `btn btn-error rounded-full` | Destructive (revoke token) — always paired with confirm modal |
| Icon | `btn btn-circle btn-ghost bg-base-200` | Top-nav icon actions, card-corner toggles |

Buttons are always pill-shaped. No square buttons.

### 6.5 Inputs & search

- Default input: `rounded-xl bg-base-100 border border-line focus:border-primary focus:ring-0 px-4 py-2.5 text-sm`.
- Search bar (top nav): `rounded-full bg-base-100 border border-line px-5 py-2.5` with a leading magnifier icon and trailing ⌘K hint when available.
- Placeholder color: `text-subtle`.

### 6.6 Navigation

**Top bar layout** (left → right):

1. Logo lockup: 32px primary-colored squircle mark + brand text `font-bold text-base`.
2. Center nav: flat text links, 24px gap, `text-sm font-medium`. Active link: `text-ink` + 2px primary underline offset 8px; inactive: `text-muted`.
3. Right cluster: search (flex-1 up to 480px) + icon buttons (settings, notifications) + avatar (40px circle).

**Left sidebar** (per EPIC-006 shell): collapse to top-only nav on screens < 1024px. On desktop: 240px wide, `bg-base-100` with `shadow-card`, rounded-3xl, inset from edges by 16px. Active item: `bg-primary-soft text-primary` with pill background.

### 6.7 Tables

- No outer border. Row dividers only: `border-b border-line`.
- Header row: `text-xs uppercase tracking-wide text-muted font-semibold`.
- Body rows: 56px minimum height; hover wash `bg-base-200`.
- Last column reserved for row actions (icon button menu).

### 6.8 Modals

- Backdrop: `bg-ink/40 backdrop-blur-sm`.
- Panel: `rounded-2xl bg-base-100 shadow-card p-8 max-w-lg`.
- Token-issuance modal (critical): plaintext token in `bg-base-200 rounded-xl p-4 font-mono text-sm select-all`, with a single "Copy" icon button and the mandatory "I've saved it" checkbox gating the close button.

### 6.9 Empty states

- Icon (48px, `text-subtle`), then `text-xl font-semibold` headline, then `text-sm text-muted` supporting line, then a primary CTA button.
- Copy is actionable (per EPIC-006 Q6): "No projects yet. Create your first →" — not passive.

### 6.10 Toast / notifications

- Bottom-right, 320px wide, `rounded-2xl shadow-card p-4`.
- Colored left border (4px) matching semantic token (success/warning/danger).
- Auto-dismiss 4s for info/success; danger requires manual dismiss.

---

## 7. Layout

### 7.1 Shell

```
┌──────────────────────────────────────────┐
│ [logo]   [home messages discover ...]   [search] [⚙] [🔔] [avatar] │   ← top bar, 72px, canvas bg
├──────────────────────────────────────────┤
│                                          │
│   [  main content — bento grid  ]        │   ← 16px inset, 24px gutter
│                                          │
└──────────────────────────────────────────┘
```

Content max-width: 1440px, centered, with 32px side padding ≥ 1280px; 16px below that.

### 7.2 Dashboard bento

On xl screens:
- Row 1: hero card (60% width) + side stack (40%).
- Row 2: two to three equal-weight cards.

On md screens: single column, cards stack at full width.

On sm screens (< 640px): single column, card radius drops to `rounded-2xl`, padding to `p-4`. Mobile is usable-not-polished (per EPIC-006 Q5) — no drawer nav, top-bar wraps.

---

## 8. Charts (Chart.js)

Per EPIC-006 Q2, charts use Chart.js v4.

**Palette** (in order — pass as `dataset.backgroundColor` array):

1. `#E85C2F` (primary)
2. `#7BA4D4` (secondary)
3. `#1A1F2E` (ink — for comparison series)
4. `#D89B2B` (warning — for outlier callouts)

**Chart defaults** (set once in `admin/src/lib/charts.ts`):

```ts
Chart.defaults.font.family = 'Inter Variable, Inter, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B7280';                   // muted
Chart.defaults.borderColor = '#ECE8E1';             // line
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.elements.bar.borderRadius = 6;
Chart.defaults.elements.line.tension = 0.35;
```

- Gridlines: horizontal only, `#ECE8E1`.
- Axis labels: `text-xs text-muted`.
- Tooltips: dark (`bg-accent text-accent-content rounded-xl`) matching value-chip style.

---

## 9. Icons

**Library:** `lucide-svelte` (already specified in EPIC-006 §4). 20px default, 16px inline, 24px nav.

- Stroke width: `1.75`.
- Color: inherit from parent (`currentColor`).
- For branded category tiles (like the orange squircle in the inspiration image): 40px `rounded-2xl` container, `bg-primary/12` or `bg-secondary/12`, glyph at 20px in primary/secondary color.

---

## 10. Motion

Minimal. Use these durations:

| Purpose | Duration | Easing |
|---|---|---|
| Hover/focus state | 120ms | ease-out |
| Modal open/close | 180ms | ease-out |
| Page transitions | 240ms | ease-in-out |
| Chart enter | 400ms | ease-out |

No bounce/spring. No parallax. Respect `prefers-reduced-motion: reduce` — disable all transitions.

---

## 11. Accessibility Baseline

Enforced on every component:

- **Contrast:** body text ≥ 4.5:1 on its background; large text ≥ 3:1. `--cg-muted` on `--cg-canvas` passes AA large-text only — do not use it for body.
- **Focus:** visible ring on every interactive element — `focus-visible:outline-2 focus-visible:outline-primary outline-offset-2`.
- **Keyboard:** all actions reachable by Tab/Enter/Space. Modals trap focus. Esc closes modals.
- **Icons-only buttons:** require `aria-label`.
- **Forms:** every input has a visible `<label>` or a visually-hidden one (`sr-only`). Error text uses `aria-describedby`.
- **Tables:** header cells are `<th scope="col">`. Action menus have accessible names.
- **Live regions:** toasts use `role="status"` (info/success) or `role="alert"` (error).

---

## 12. Copy Tone

- Direct, operator-friendly, low on marketing fluff.
- Empty states: actionable ("Create your first project →"), never passive ("No data available").
- Destructive confirmations: spell out consequence + irreversibility ("Revoking this token logs out every client using it. This cannot be undone.").
- Errors: say what happened + what to try next. Avoid stack traces in the UI.

---

## 13. Applying this guide

- **Story-006-01 (scaffold):** wire the `cleargate` DaisyUI theme, install `@fontsource-variable/inter`, define `shadow-card` + token CSS variables in `app.css`.
- **Every other EPIC-006 story:** consume tokens + components. If a story needs a component pattern not covered here, extend this file first, then implement.
- **Changes to this guide:** amend here, bump `updated_at`, and call out any story that needs re-checking in the commit message.
