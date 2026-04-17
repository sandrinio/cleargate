---
story_id: "STORY-006-01"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
design_guide_ref: "../../knowledge/design-guide.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-006-01: SvelteKit + DaisyUI + Tailwind Scaffold

**Complexity:** L2.

## 1. The Spec
Scaffold `admin/` with **SvelteKit 2 (Svelte 5 runtime)**, **Tailwind CSS v4** (CSS-first config via `@import "tailwindcss"`), **DaisyUI v5** with the custom **`cleargate` theme** (registered via `@plugin "daisyui/theme"` per the design guide — not the stock `corporate` theme), TypeScript strict, `@sveltejs/adapter-node`. Base layout matches the [ClearGate Design Guide](../../knowledge/design-guide.md) §7 shell (72px top bar on cream canvas, inset sidebar, bento main). Multi-stage Dockerfile using **Node 24 alpine**.

### Stack pins (per [INDEX stack table](../INDEX.md#stack-versions-reference-verified-april-2026))
- `@sveltejs/kit` ^2 · `svelte` ^5 · `vite` current
- `tailwindcss` ^4.2 · `@tailwindcss/postcss` ^4.2 · `daisyui` ^5.5
- `@sveltejs/adapter-node` current
- `@fontsource-variable/inter` current (self-hosted, per design guide §3)
- `lucide-svelte` current (icons, per design guide §9)

### Design-guide wiring (mandatory in this story)
Per [design-guide.md](../../knowledge/design-guide.md) — this story establishes the tokens that every other EPIC-006 story consumes. Do not skip any:

1. **`admin/src/app.css`** — `@import "tailwindcss"`, register the `cleargate` DaisyUI theme block verbatim from design guide §2.2, set `html, body { background: var(--color-base-300); }`, import Inter Variable.
2. **`admin/tailwind.config.js` (or v4 CSS config)** — register `shadow-card` custom shadow from §5, expose `--cg-*` CSS variables as Tailwind utilities where cleaner than raw vars.
3. **Font loading** — import `@fontsource-variable/inter` in `app.css`; set the font-family stack from §3 on `body`.
4. **Shell** — header + (desktop) inset sidebar per §7.1. Nav active state = 2px primary underline (§6.6). Mobile (< 1024px): sidebar collapses to top-only nav.
5. **Icon button primitive** — a reusable `<IconButton />` component matching §6.4 "Icon" spec (circle, ghost, `bg-base-200` resting state).

Empty shell is acceptable for main-content area in this story; populated views ship in later stories.

## 2. Acceptance
```gherkin
Scenario: Dev server
  When npm run dev in admin/
  Then http://localhost:5173 shows the empty shell with header + inset sidebar
  And the page background is the cream canvas (#F4F1EC)
  And the logo lockup + center nav + right icon cluster match the design guide §7.1

Scenario: Theme tokens exposed
  When I inspect the :root computed styles
  Then --color-primary resolves to #E85C2F
  And --color-base-300 resolves to #F4F1EC
  And --radius-box resolves to 1.5rem

Scenario: Typography loaded
  When I inspect a body element
  Then its computed font-family starts with "Inter Variable"
  And no Google Fonts network request is made at runtime

Scenario: Prod build
  When npm run build then node build
  Then server starts and serves the same shell with identical styling
```

## 3. Implementation
- `admin/` full scaffold files per PROPOSAL-003 §3.1
- DaisyUI `cleargate` theme block copied verbatim from [design-guide.md §2.2](../../knowledge/design-guide.md#22-daisyui-theme-cleargate)
- Shell layout per [design-guide.md §7.1](../../knowledge/design-guide.md#71-shell)

## Ambiguity Gate
🟢.
