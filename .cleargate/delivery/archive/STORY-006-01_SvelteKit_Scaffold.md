---
story_id: STORY-006-01
parent_epic_ref: EPIC-006
parent_cleargate_id: "EPIC-006"
sprint_cleargate_id: "SPRINT-04"
status: Done
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006, design-guide.md
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on: []
blocks:
  - STORY-006-02
  - STORY-006-03
  - STORY-006-04
  - STORY-006-05
  - STORY-006-06
  - STORY-006-07
  - STORY-006-08
  - STORY-006-09
  - STORY-006-10
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:34.918Z
push_version: 2
---

# STORY-006-01: SvelteKit + DaisyUI + Tailwind Scaffold

**Complexity:** L2 — establishes every shared token that the other nine EPIC-006 stories consume. No business logic; all the risk is in theme fidelity and build wiring.

## 1. The Spec

Scaffold the `admin/` package with **SvelteKit 2 (Svelte 5 runtime, runes only)**, **Tailwind CSS v4** (CSS-first config via `@import "tailwindcss"`), **DaisyUI v5** with the custom **`cleargate`** theme registered per [Design Guide §2.2](../../knowledge/design-guide.md#22-daisyui-theme-cleargate), TypeScript strict, and `@sveltejs/adapter-node`. Ship the shell layout from [Design Guide §7.1](../../knowledge/design-guide.md#71-shell) (72 px top bar on cream canvas, 240 px inset sidebar on ≥ 1024 px, bento main content region) plus the shared primitives that every EPIC-006-0x story relies on: `<IconButton />`, `<Card />` wrapper class, and the nav-active underline treatment.

**No business logic in this story.** Main content area renders a placeholder ("Dashboard coming in STORY-006-03"); the shell, tokens, fonts, and build pipeline are the deliverable.

### Stack pins (per [INDEX stack table](../INDEX.md#stack-versions-reference-verified-april-2026))
- `@sveltejs/kit` ^2 · `svelte` ^5 · `vite` current · `@sveltejs/adapter-node` current
- `tailwindcss` ^4.2 · `@tailwindcss/postcss` ^4.2 · `daisyui` ^5.5
- `@fontsource-variable/inter` current (self-hosted per Design Guide §3)
- `lucide-svelte` current (icons per Design Guide §9)
- TypeScript ^5.8 (workspace-pinned)

### Design-Guide wiring (mandatory — every item is a QA gate)

1. **`admin/src/app.css`**
   - `@import "tailwindcss";`
   - `@plugin "daisyui" { themes: cleargate --default; }`
   - `@plugin "daisyui/theme" { ... }` block copied **verbatim** from Design Guide §2.2 — including `--color-base-300: #F4F1EC`, `--color-primary: #E85C2F`, `--radius-box: 1.5rem`, etc.
   - `html, body { background: var(--color-base-300); }`
   - `@import "@fontsource-variable/inter";` and set body `font-family` per Design Guide §3.
2. **Tailwind config (v4 CSS-first)** — register `--cg-shadow-card` custom shadow from §5 as a Tailwind utility `shadow-card`.
3. **Typography classes** exposed per Design Guide §3 scale; use `font-variant-numeric: tabular-nums` utility on a `.num` class for stat cards.
4. **Shell primitives** (`admin/src/routes/+layout.svelte` + `admin/src/lib/components/`):
   - Top bar 72 px, canvas background. Left: 32 px primary squircle + brand text `ClearGate`. Center: nav (`Dashboard`, `Projects`, `Audit`) — active link has 2 px primary underline offset 8 px. Right: search slot (placeholder in this story), two `<IconButton />` slots (settings, notifications) + avatar slot.
   - Desktop sidebar (≥ 1024 px): 240 px, `bg-base-100`, `shadow-card`, `rounded-3xl`, 16 px inset from edges; items placeholder. Active treatment per Design Guide §6.6.
   - Mobile (< 1024 px): sidebar collapses; top bar remains, nav items surface in a lucide `menu` icon dropdown.
5. **`<IconButton />` primitive** — circle, ghost, `bg-base-200` resting state, `aria-label` mandatory, 40 px hit area (Design Guide §6.4 Icon variant).
6. **Empty-state + toast + modal shells** — shared components under `admin/src/lib/components/` implementing Design Guide §§6.8–6.10 so later stories don't redesign them.

### Workspace + tooling

- Add `admin` to the root `package.json` workspaces array (`["cleargate-cli", "mcp", "admin"]`). Confirm `mcp/` and `cleargate-cli/` typecheck still green after the workspace change.
- `admin/package.json` — `name: "@cleargate/admin"`, `private: true` (not published; ships as Docker image only). Scripts: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit` + `svelte-check`), `test` (vitest unit), `e2e` (Playwright), `lint` (biome or eslint — pick at M1).
- `admin/tsconfig.json` — strict; extends `@sveltejs/kit/tsconfig`.
- **Playwright** — install `@playwright/test`, create `admin/playwright.config.ts`, write one smoke test asserting the shell renders on `/` (the placeholder content area is fine). Chromium-only in v1; Firefox/WebKit deferred.
- **Vitest** — unit-test harness set up with one passing test against `<IconButton />` (a11y label applied).

## 2. Acceptance

```gherkin
Scenario: Dev server
  When I run `npm run dev --workspace admin`
  Then http://localhost:5173 serves the shell within 3s
  And the main content shows the placeholder "Dashboard coming in STORY-006-03"
  And the page background is cream (#F4F1EC)
  And the logo lockup + center nav + right icon cluster match Design Guide §7.1

Scenario: Theme tokens exposed
  When I open DevTools on `/` and inspect :root computed styles
  Then --color-primary resolves to #E85C2F
  And --color-base-300 resolves to #F4F1EC
  And --color-base-100 resolves to #FFFFFF
  And --radius-box resolves to 1.5rem
  And --color-accent resolves to #1A1F2E

Scenario: No stock DaisyUI theme leaked
  When I grep `admin/` for `theme: "corporate"`, `theme: "light"`, `theme: "dark"`
  Then zero matches

Scenario: No Svelte-4 reactive blocks
  When I grep `admin/src` for lines matching `^\s*\$:`
  Then zero matches

Scenario: Typography loaded without Google Fonts call
  When I visit `/` with a cold cache and monitor network
  Then no request hits fonts.googleapis.com or fonts.gstatic.com
  And body computed font-family starts with "Inter Variable"

Scenario: Mobile shell degrades cleanly
  Given viewport width 390 px
  When I open `/`
  Then the sidebar is hidden
  And a menu icon button in the top bar opens a nav drawer
  And no horizontal scroll appears

Scenario: Prod build + adapter-node
  When I run `npm run build --workspace admin` then `node admin/build`
  Then the server listens on PORT and serves the same shell with identical styling
  And the build output prints total bundle size; main client chunk gzipped < 60 KB

Scenario: Playwright smoke
  When I run `npm run e2e --workspace admin`
  Then at least one test passes asserting the shell renders on `/`

Scenario: Typecheck clean workspace-wide
  When I run `npm run typecheck --workspaces`
  Then admin/, mcp/, and cleargate-cli/ all exit 0
```

## 3. Implementation

- `admin/package.json`, `admin/svelte.config.js`, `admin/vite.config.ts`, `admin/tsconfig.json`, `admin/playwright.config.ts`
- `admin/src/app.html`, `admin/src/app.css`, `admin/src/app.d.ts`
- `admin/src/routes/+layout.svelte` — shell
- `admin/src/routes/+page.svelte` — placeholder
- `admin/src/lib/components/IconButton.svelte` + unit test
- `admin/src/lib/components/Card.svelte` (wrapper class convenience) + unit test
- `admin/src/lib/components/Modal.svelte` (shell only; no gating logic — STORY-006-05 extends)
- `admin/src/lib/components/Toast.svelte` + store (`admin/src/lib/stores/toast.ts`)
- `admin/src/lib/components/EmptyState.svelte`
- `admin/tests/shell.spec.ts` (Playwright smoke)
- Root `package.json` workspaces array updated; `package-lock.json` regenerated

## 4. Quality Gates

- **Design-Guide token grep** (CI + pre-commit): four assertions pass — `#E85C2F`, `#F4F1EC`, `1.5rem`, `Inter Variable` all present in `admin/src/app.css`.
- **Forbidden-pattern grep**: zero matches for stock theme names and Svelte-4 `$:` reactivity.
- **Bundle budget**: main client chunk ≤ 60 KB gzipped (scaffold only — no Chart.js, no business logic). STORY-006-08 owns lazy Chart.js; do not regress the budget here.
- **Lighthouse CI** (headless, Playwright): performance ≥ 90 on `/` against the prod build.
- **Svelte-check**: zero errors, zero warnings on strict mode.
- **Workspace typecheck**: `mcp/` and `cleargate-cli/` still green after root `package.json` change.

## 5. Open questions

1. **Lint tool.** Biome vs. ESLint. Biome is faster and one-tool-fits-all; ESLint has richer Svelte plugin ecosystem. Decide at M2 architect plan; record flashcard either way.
2. **Global toast store location.** `admin/src/lib/stores/toast.ts` is the default; if later stories need more complex notification state, revisit at STORY-006-04.
3. **Playwright CI budget.** Full smoke suite target < 30 s locally. If it creeps, split `smoke` vs `full` at STORY-006-10.

## Ambiguity Gate

🟢 — every design decision is locked in the Design Guide; stack pins are in INDEX; only tooling micro-choices remain (lint tool, toast store layout).
