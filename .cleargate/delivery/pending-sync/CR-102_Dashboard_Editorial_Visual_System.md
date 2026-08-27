---
cr_id: CR-102
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cli
context_source: |
  Direct user request 2026-08-02 with an inline reference artifact
  (https://claude.ai/code/artifact/1c23eefb-0eb9-4c7f-84de-87e686b6ac17 — "SPRINT-08 — Execution
  Dashboard"), fetched and its full design system extracted. Initial brief: "we also have the
  template. can you make changes in the template too? so it feels like it's cleargate, but also
  similar to the one i shared." SCOPE CORRECTED by the owner on first Brief review, verbatim:
  "design should stay the same as it suits cleargate. i just though to adopt cards, fonts and the
  way it shows information. we also should leave the data we show to the user." The first draft of
  this CR proposed a palette rederivation and a dark ramp; both are withdrawn. Grounded against
  cleargate-cli/src/dashboard/render.ts:114-288 (the live STYLE block) and :296-824 (the SSR
  builders and render()), read field by field to inventory what must survive.
created_at: 2026-08-02T00:00:00Z
updated_at: 2026-08-02T14:16:10Z
created_at_version: 0.22.0
updated_at_version: 0.23.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-02T14:16:10Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-102
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-02T14:47:44Z
  sessions: []
---

# CR-102: Cards, Type, and Density — the Dashboard Borrows Form, Not Identity

## 0.5 Open Questions

- **Question:** Does "adopt cards" mean the reference's square corners, or ClearGate's rounded ones at a smaller radius?
- **Recommended:** Square. The reference's card is inseparable from its construction — a hairline border, no shadow, and a hard edge that lets a 1px grid gap read as a rule rather than a seam. A rounded version of it is neither thing. This is a **per-surface** decision about one dense, read-only instrument; the admin console keeps its radii and `design-guide.md` is not amended. The one round element that survives is the in-progress state dot, which is a dot.
- **Human decision:** {populated during Brief review}

- **Question:** ~~Warm ClearGate palette vs the reference's cool grey-green + teal?~~
- **RESOLVED 2026-08-02 by owner:** ClearGate's palette stands, unchanged. All 17 `--cg-*` custom properties at `render.ts:115-124` carry through byte-for-byte. No token is renamed, no hue is added, no hue is retuned. The reference contributes form only.
- **Human decision:** Resolved — no palette change.

- **Question:** ~~Add a dark ramp?~~
- **RESOLVED 2026-08-02 by owner:** No. "Design should stay the same" rules it out; the dashboard stays the warm single-theme instrument it is today. Recorded here so a later agent does not read its absence as an oversight and add one.
- **Human decision:** Resolved — out of scope.

- **Question:** ~~Adopt the reference's "loop spine" / "gates caught" / "open at close" panels?~~
- **RESOLVED 2026-08-02 by owner:** No — and the stronger rule applies in the other direction too: *"we also should leave the data we show to the user."* Nothing is added, and **nothing is removed**. §1 carries a field-by-field inventory of what must survive; §4 asserts it.
- **Human decision:** Resolved — data surface frozen.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that depth is expressed with shadow. `--cg-shadow-card` (`render.ts:120`) sits on every card, stat tile, and story card, with a `translateY(-2px)` hover lift (`:185`). Across forty story cards that reads as forty floating objects. It is the only token this CR deletes, and it is deleted because the new card carries its own edge.
- Forget the rounded vocabulary on structural elements — `24px` cards (`:143`), `16px` stat tiles and story cards (`:149`, `:180`), `9999px` pills, chips and tracks. It costs the page its grid: nothing aligns to anything because nothing has a corner.
- Forget that monospace is only for `code` and `pre`. Every identifier, count, label, and timestamp on this page is data, and data in a proportional face is data you have to read instead of scan.
- Forget section headings at `16px/600` sentence case (`:173`, `:210`). They carry more weight than the content beneath them.
- Forget `240px` as the story-card floor (`:144`). It fits roughly four cards per row on a laptop; a sprint of forty then costs ten rows of scrolling to see at all.

**New Logic (The New Truth) — form only:**

- **The palette is untouched.** `--cg-canvas #F4F1EC`, `--cg-surface #FFFFFF`, `--cg-surface-muted #F7F5F1`, `--cg-ink #1A1F2E`, `--cg-ink-soft #4B5363`, `--cg-muted #6B7280`, `--cg-subtle #9CA3AF`, `--cg-line #ECE8E1`, `--cg-primary #E85C2F`, `--cg-primary-soft #FBE4D9`, `--cg-secondary #7BA4D4`, `--cg-secondary-soft #DEE8F4`, `--cg-success #2F9E6B`, `--cg-warning #D89B2B`, `--cg-warning-soft #F5E6C8`, `--cg-danger #C23A3A`, `--cg-teal #2F9E93` — all sixteen survive verbatim. `--cg-shadow-card` is the only deletion. Two additions are typography, not color: `--cg-mono` and `--cg-sans`.
- **Cards are flat and hairline-bounded.** `border: 1px solid var(--cg-line)`; `border-radius: 0`; no `box-shadow`; no hover transform. Hover moves the border to `--cg-subtle` instead of lifting the card.
- **The stat tiles become a mesh.** `display:grid; gap:1px; background:var(--cg-line); border:1px solid var(--cg-line)`, each tile on `--cg-surface`. The gap *is* the rule — one hairline lattice instead of six shadowed boxes. Same six tiles, same six values.
- **Monospace carries the data.** `--cg-mono` on story IDs, all counts and token figures, state labels, lane pills, role chips, worktree paths, timestamps, filter chips, and section notes. `--cg-sans` stays on prose: the sprint goal, story titles, and every markdown modal body.
- **Labels are uppercase and tracked.** Section heads at `12px/700`, `text-transform:uppercase`, `letter-spacing:.13em`, underlined by `1px solid var(--cg-line)`, with the count or note pushed right by `margin-left:auto`. Stat-tile labels at `10.5px/.1em`. The existing `.stat-label` and `.filter-label` already do a weaker version of this; it becomes the page's consistent register.
- **The masthead gets a 2px `--cg-ink` rule** under it, the sprint ID in mono at `30px/600/-0.02em`, and the status + generated-at line in `12px` mono.
- **Story cards become dense items.** `1px solid var(--cg-line)` plus a `3px` left border carrying the existing `data-status` color — the mapping at `:186-189` is unchanged. Grid floor drops `240px → 172px`, which roughly doubles the sprint visible per screen. Every field stays: ID, state pill, title (or the italic `— untitled —`), lane pill, `QA n · Arch n`, `n report(s)`, and the `view story` button.
- **State pills go square and mono** at `10px`, uppercase, `.07em`. All eight `state.json` states keep a distinct treatment — the constraint CR-084's QA bounce established, and the reason `--cg-teal` and `--cg-warning-soft` exist. `STATE_PILL_MAP` (`:56-73`) is not edited.
- **Progress bars go flat.** `border-radius: 0` on `.progress-track`, `.mstone-track`, `.tok-bar`; segments keep their existing four-color mapping and their existing widths.
- **`prefers-reduced-motion` keeps suppressing transitions** (`:287`), unchanged.
- **The wordmark stays** (`:290`); its `8px` mark radius goes to `0` with everything else. Favicon unchanged.

**The data surface is frozen. Every one of these survives, field for field:**

| Surface | Fields that must still be on the page |
|---|---|
| Stats (`:441`) | `%` complete · `done/total` · in-flight · queued · output tokens · bounces; segmented bar (done/active/blocked/queued); legend with all four counts |
| Filter bar (`:494`) | milestone chips (All + every group) · status chips (All/Done/Active/Blocked/Queued); `data-ftype`/`data-fval` contract intact |
| Milestones (`:330`) | group name · `done/total` · progress track |
| Story card (`:308`) | id · state pill (+ dot on in-progress) · title or `— untitled —` · lane pill · `QA n · Arch n` · `n report(s)` · `view story` |
| Epics (`:354`) | one button per epic id |
| Tokens (`:369`) | per agent: name, total, bar vs. max, `in · out · cache-w · cache-r`; grand total + dispatch count |
| Worktrees (`:390`) | every path |
| Reports (`:397`) | total · per-role chips with counts · sprint-report filename or "not yet generated" |
| Execution (`:410`) | hint line · `view timeline` button |
| Diagnostics (`:99`) | CR-097 block, always emitted, empty when healthy |
| Modal (`:815`) | title · markdown body · close; `data-doc-key` lookup into the inlined DATA blob |
| Empty states (`:37-41`) | all five strings, under their existing conditions |

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update CR: [CR-084](../archive/CR-084-Sprint-Dashboard-In-CLI-Payload.md) — authored the `STYLE` block, the stat tiles, and the story-card grid being restyled. Its all-8-states-distinct QA constraint is carried forward, not relaxed.
- [ ] Invalidate/Update CR: [CR-097](CR-097_Dashboard_Truthfulness_And_Single_Tab.md) — **must not regress.** `#header-diagnostics` has to keep being emitted unconditionally (empty when healthy) with markup identical server-side and client-side. Restyling it without preserving that contract silently re-breaks the feature CR-097 exists to provide.
- [ ] Invalidate/Update CR: [CR-101](CR-101_Dashboard_Auto_Update_Daemon.md) — disjoint sandboxes by construction (CR-101 owns `src/commands/**` and `serve.ts`; this CR owns `render.ts`). Either may land first.
- [ ] Database schema impacts? **No.** Pure presentation. `collect.ts` and `markdown.ts` are not opened, so every data shape, diagnostic, and empty-state string is preserved by construction.
- **The real risk is `buildClientScript()`** (`:531-745`). It re-renders panels in the browser every ~2s and must emit byte-identical markup to the SSR builders. Every class name and element order this CR changes must change in both places, or the first poll tick visibly rewrites the page into a different design. This is the single most likely way to ship a broken dashboard, and it is why §4's first test diffs SSR against the patched DOM instead of eyeballing a screenshot.
- **Test fallout:** assertions matching removed class names (`.stat-tile`, `.story-card`, `.card`, `.pill`) must be migrated, not deleted.
- **No behavioral break.** No flag, path, exit code, CLI output, or data contract changes.
- **Scope guard:** `knowledge/design-guide.md` is read, never edited. This CR records a per-surface divergence on radius and shadow; it does not change the brand.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/dashboard/render.ts:114-288` — the `STYLE` template literal. Rewritten; the sixteen `--cg-*` color tokens at `:115-124` are carried through verbatim and `--cg-shadow-card` is dropped.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:296-503` — the SSR builders (`renderDocButton`, `renderStoryCard`, `renderMilestones`, `renderEpics`, `renderTokensPanel`, `renderWorktreesPanel`, `renderReportsPanel`, `renderExecPanel`, `renderStats`, `renderFilterBar`). Class vocabulary updated; **every emitted field unchanged**.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:531-745` — `buildClientScript()`. Updated in lockstep with the builders above.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:749-824` — `render()`, the document shell, header, `panel-grid`, modal, footer.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:56-73` — `STATE_PILL_MAP` / `STATUS_FALLBACK_PILL`. **Not edited**; only the CSS the class names resolve to changes.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:99` — `renderDiagnostics()`. Restyled; the always-emitted contract preserved verbatim.
- **Surface:** `cleargate-cli/src/dashboard/render.ts:290` — `wordmark()`. Retained; mark radius dropped.
- **Surface:** `knowledge/design-guide.md:37-51` — the brand palette. Read, not edited; it is the authority this CR defers to.
- **Why this CR extends rather than rebuilds:** the information architecture, the data, the diagnostics contract, the filter mechanism, the modal, and the 8-state vocabulary are all already right and all stay. `collect.ts` (705 lines) and `markdown.ts` (245 lines) are not opened. What changes is card construction, type register, and density — form, not identity, and not content.

## Prior work

- [[CR-084]] — shipped the dashboard and authored the current `STYLE` block, stat tiles, and story-card grid.
- [[CR-097]] — added `#header-diagnostics` and the hard SSR/client markup-parity constraint that governs this CR's riskiest surface.
- `cleargate wiki query "dashboard"` → `no matches` (the CLI wiki-query greps `wiki/index.md` only — `wiki-query.ts:3-13`). Direct grep over `.cleargate/delivery/**`, `.cleargate/wiki/crs/`, and `.cleargate/FLASHCARD.md` surfaced the two items above and no prior visual-design work item for the dashboard.
- FLASHCARD `#cli #parse #dashboard` 2026-07-14 [CR-084] — plan-table columns vary per sprint; parse by header name. Not a visual concern, but it is why blank titles and a single "All stories" group are legitimate render states this CR must keep styling correctly.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/dashboard/render.ts` — `STYLE`, `wordmark`, `renderDiagnostics`, all SSR builders, `buildClientScript`, `render`
- `cleargate-cli/test/dashboard/render.node.test.ts`
- `cleargate-planning/.claude/skills/sprint-dashboard/SKILL.md` — one paragraph on the visual system, so a downstream agent does not "fix" it back

**Do not touch:** `collect.ts`, `markdown.ts`, `serve.ts`, `open.ts`, `daemon.ts`, `src/commands/**` (CR-101 owns those), `knowledge/design-guide.md`, `admin/`.

## 4. Verification Protocol

**Command:** `cd cleargate-cli && npm run typecheck && npm test`

Tests that must exist and pass:

1. **SSR/client parity.** For a fixture with all 8 states, ≥2 milestones, tokens, worktrees, reports, epics and an execution log: render server-side, apply `buildClientScript`'s patch functions to the same data, assert each patched container's markup is identical. Guard for the §2 risk.
2. **Data-surface freeze.** One assertion per row of the §1 table — the rendered document contains every listed field for a fully-populated fixture. This is the machine check on *"leave the data we show to the user."*
3. **Palette freeze.** Parse `STYLE` and assert all sixteen `--cg-*` color tokens are present with their exact current hex values. A future retune then fails the suite rather than drifting.
4. **CR-097 regression.** `#header-diagnostics` present when `diagnostics` is empty; the healthy-case assertion checks the container's *contents*, not a whole-document `includes()` — which CR-097 already established cannot distinguish "rendered" from "renderable".
5. **All 8 states distinct.** Every `STATE_PILL_MAP` value yields a distinguishable treatment; no two collapse.
6. **No shadows, no structural radii.** `STYLE` contains no `box-shadow`, and no non-zero `border-radius` outside the allow-list (`.state-dot`).
7. **Self-contained.** No external font, stylesheet, script, or image URL — the snapshot must render offline from `file://`. (Guards against a webfont creeping in with the type work.)
8. **Empty states preserved.** All five `EMPTY_*` strings appear under their existing conditions.

**Manual:** `cleargate sprint dashboard --serve` against a real sprint. Confirm (a) the first poll tick at ~2s does not visibly change the page, (b) the modal opens and reads correctly, (c) the filter chips still filter, (d) at 375px nothing scrolls sideways.

---

## Context Source

> Discovery audit. Populated from verified codebase grounding and recorded direct approval.

**context_source:** direct user request 2026-08-02 naming the reference artifact inline, per the standing proposal-gate waiver (`feedback_proposal_gate_waiver`). The reference's design system was fetched and extracted in full rather than described from memory. The owner's first-review correction — *"design should stay the same as it suits cleargate. i just though to adopt cards, fonts and the way it shows information. we also should leave the data we show to the user"* — narrowed this CR from a palette rederivation to a form-only change; the withdrawn proposals are kept as struck §0.5 entries so the decision is legible later rather than looking like an omission. The §1 data-surface table was built by reading `render.ts:296-824` field by field, not from memory.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
