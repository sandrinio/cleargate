---
cr_id: CR-066
parent_ref: close_sprint.mjs Step 2.6 (lifecycle reconciler)
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cli,sprint-close,reconciler
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-05-17T00:00:00Z
created_at: 2026-05-16T00:00:00Z
updated_at: 2026-05-16T00:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
context_source: |
  Surfaced 2026-05-16 during SPRINT-28 slate sizing. Audit of pending-sync/ epics
  found six with stale statuses while their children archived as Done in earlier
  sprints (EPIC-010, -012, -016, -021, -023, -026). close_sprint.mjs Step 2.6a/b
  already reconciles leaf orphans via reconcileCrossSprintOrphans
  (cleargate-cli/src/lib/lifecycle-reconcile.ts) but never rolls up to parent
  Epics/Sprints. This CR extends the existing reconciler — does not introduce a
  parallel one.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-16T06:41:36Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-066
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-16T23:31:12Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-16T23:31:25.164Z
push_version: 1
---

# CR-066: Sprint Close Reconciles Parent (Epic / Sprint) Status Against Archived Children

## 0.5 Open Questions

> All resolved 2026-05-17 at Gate-1 ack.

- **Q1: Auto-flip parent epic status?** **Resolved:** auto-flip when the epic's goal is met (100% of children in terminal status). Partial coverage = leave alone + warn (no flip). No human ack needed on the flip itself — the close diff captures it.
- **Q2: What counts as a "terminal" child status?** **Resolved:** `Completed` only. ONE meaning of done across all artifact types — see CR-067 (vocab unification migration). During the CR-067 migration window the reconciler tolerates `{Done, Verified, Completed}` as terminal-for-read; after CR-067 lands the set tightens to `{Completed}` only and all flips write `Completed`.
- **Q3: Pre-Gate-4 (blocks close) or post-Gate-4 (advisory)?** **Resolved:** **block close.** Step 2.6c is hard-block by default — any parent that would auto-flip flips before close completes; any partial-coverage warn entry blocks close until the human ack's the partial state. No `--no-strict` opt-out flag in v1.
- **Q4: Sub-epic rollup for EPIC-023 (`sub_epics:` list).** **Resolved:** rollup walks `sub_epics:` recursively. Sub-epics with `status: DEFERRED` are excluded from the denominator (treated as abandoned scope, don't block parent). So EPIC-023 flips when sub-epics 1 + 2 + 4 are all terminal, regardless of sub-epic 3.

## 1. The Context Override (Old vs. New)

**Obsolete logic (what to remove / forget):**
- Sprint close trusts the human to manually flip parent Epic statuses when their last child story merges. In practice, this never happens — Epic frontmatter rots while the children all archive cleanly.
- The lifecycle reconciler (Step 2.6a/b) only checks **leaf items** (stories in pending-sync with terminal status in any closed sprint's state.json). Parents are invisible to it.

**New logic (the new truth):**
- During Step 2.6 of `close_sprint.mjs`, after the cross-sprint orphan check, walk every active Epic and Sprint and roll up its children's statuses from the archive.
- **Auto-flip on 100% coverage (no ack needed)** — per Q1 resolution. If every child is in terminal status, rewrite the parent's `status:` → `Completed` atomically (same write pattern as Step 7 attribution write-back). Emit one log line per applied flip: `Step 2.6c: EPIC-016 status Draft → Completed (6/6 children Completed: STORY-016-01..06)`. The close summary captures the diff for human review post-hoc.
- **Block close on partial coverage** — per Q3 resolution. If an active Epic/Sprint has *some* children in terminal status but not all, Step 2.6c halts close with the per-parent partial-coverage list. Human must either (a) decompose+ship the missing children, (b) explicitly abandon them, or (c) ack the partial state in this close window. No `--no-strict` opt-out flag in v1.
- **Terminal = `Completed` only** — per Q2 resolution (see CR-067 vocab unification). During the CR-067 migration window, the reconciler tolerates `{Done, Verified, Completed}` as terminal-for-read for back-compat; after CR-067 lands the set tightens to `{Completed}` only.
- **Sub-epic recursion** — per Q4 resolution. For parents with a `sub_epics:` list (e.g., EPIC-023), rollup walks the list recursively. Sub-epics with `status: DEFERRED` are excluded from the denominator (treated as abandoned scope, don't block parent).
- **Zero-children edge case** — Epics with zero ever-drafted children (e.g., EPIC-021) are NEVER flipped to `Completed`. The reconciler surfaces them as `"EPIC-021: 0 children drafted; not reconcilable — decompose or abandon"` and blocks close until the human acts.

**Why this matters now:** Today's audit (2026-05-16) of `.cleargate/delivery/pending-sync/` found six Epics with stale statuses:

| Epic | Stale status | Archived children | Reality |
|---|---|---|---|
| EPIC-010 | Draft | 7/8 (only STORY-010-02 in pending-sync) | Effectively delivered; one L3 story remains |
| EPIC-012 | Ready | 0/5 | Genuinely not delivered |
| EPIC-016 | Draft | 6/6 | DELIVERED in SPRINT-16 |
| EPIC-021 | Ready | 0 STORY-021-* ever drafted | Decomposition never happened — separate gap |
| EPIC-023 | Approved | 4/4 sub-epic-1 archived; sub-epics 2–4 placeholders | Sub-epic 1 DELIVERED |
| EPIC-026 | Ready | 2 STORY-026-* archived in SPRINT-20 | Likely DELIVERED |

Five of these six would have been auto-flipped (or surfaced as partials) at their respective sprint closes if this CR had been live.

## 2. Blast Radius & Invalidation

**Affected callers:**
- `close_sprint.mjs` — adds Step 2.6c between cross-sprint orphans (2.6b) and the merge check (Step 2.8).
- `cleargate sprint reconcile-lifecycle <sprint-id>` CLI wrapper — gains a `--parents` flag that surfaces the same rollup outside of close (for ad-hoc audits like today's).
- `cleargate-cli/src/lib/lifecycle/` — new helper `rollUpParentStatus(parent, deliveryRoot, archiveRoot)` returning `{ parent_id, current_status, proposed_status, coverage: "0/5" | "6/6" | "partial", terminal_children: [...] }`.

**Invalidated assumptions:**
- Anything that grepped `pending-sync/` for "active" Epics and assumed status was authoritative (the wiki index does this) starts seeing fewer false positives. Wiki rebuild after the first run will compact the Active section significantly.
- The wiki-lint advisory mode (`--suggest`) may surface fewer cross-refs from archived-but-stale Epics because they'll move to archive after status flip.

**Downstream items that need re-evaluation after this CR ships:**
- EPIC-010 (1 child remaining): orphaned-child report should suggest "draft STORY-010-02 cleanup or formally defer".
- EPIC-021 (zero children): zero-coverage edge case — the reconciler must NOT flip an Epic with zero ever-drafted children to Completed. Behavior: leave status alone, surface in summary as `"EPIC-021: 0 children drafted; not reconcilable — decompose or abandon"`.
- EPIC-023 (sub-epic structure): rollup must understand the `sub_epics:` frontmatter list — only flip when ALL sub-epics are terminal, not when sub-epic 1's stories are terminal.

**Risk:** false-positive auto-flip on an Epic that's partially shipped but whose remaining children were renamed/refactored. Mitigation: since v1 is block-mode (not advisory), the orphan-child detection in the existing Step 2.6a/b catches renamed-but-still-pending children BEFORE Step 2.6c runs — partial-coverage path triggers and halts close, surfacing the rename to the human for resolution.

## 3. Execution Sandbox

**Files to modify:**
- `.cleargate/scripts/close_sprint.mjs` — insert Step 2.6c after line ~398 (end of orphans block); block-mode by default per Q3. Halts close on partial coverage or zero-children case.
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — mirror.
- `cleargate-cli/src/lib/parent-rollup.ts` — **new** — exports `rollUpParentStatus()` + `walkActiveParents()`. Sibling to `lifecycle-reconcile.ts`. Handles sub-epic recursion + zero-children skip + DEFERRED exclusion.
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — re-export `rollUpParentStatus` alongside existing `reconcileCrossSprintOrphans`. TERMINAL_STATUSES (line 28) reused as `{Done, Completed, Verified}` during CR-067 migration window; tightens to `{Completed}` only after CR-067 lands (one-line edit in CR-067 itself).
- `cleargate-cli/src/commands/sprint.ts` — `reconcileLifecycleHandler` gains `--parents` flag; prints same diff as Step 2.6c without applying (read-only audit mode for use outside of close).
- Tests:
  - `cleargate-cli/test/lifecycle/parent-rollup.node.test.ts` — fixtures: full coverage flip, partial coverage warn, zero coverage skip, sub-epic structure.
  - `cleargate-cli/test/scripts/close-sprint-step-2-6c.node.test.ts` — end-to-end with fixture sprint.

**No new runtime deps.** Reuses `gray-matter` (already pulled by `cleargate push`) for frontmatter parse/write.

## 4. Verification Protocol

**Old logic eviction:**
- Grep for "manually flip Epic status" or "human-ack parent rollup" in CLAUDE.md / protocol — should now be `→ Step 2.6c auto-rollup, see CR-066`.

**New logic verification:**
1. **Unit test green** — `npm test -- parent-rollup` covers four shapes (full, partial, zero-child, sub-epic).
2. **Dogfood replay** — run `cleargate sprint reconcile-lifecycle SPRINT-27 --parents --dry-run` on the current repo and verify the output enumerates the six stale Epics from §1 with the expected proposed flips.
3. **Real close** — at SPRINT-28 close, Step 2.6c runs and flips EPIC-012's status if SPRINT-28 ships its anchor (or surfaces partial coverage). Documented in SPRINT-28 REPORT §5 Process.
4. **Idempotency** — re-running Step 2.6c with no further state change produces zero diffs.

**Definition of Done:**
- [ ] `rollUpParentStatus()` + `walkActiveParents()` exported from `cleargate-cli/src/lib/parent-rollup.ts` + re-exported from `lifecycle-reconcile.ts`.
- [ ] `close_sprint.mjs` Step 2.6c inserted; block-mode by default; auto-flips on 100% coverage, halts on partial or zero-children.
- [ ] Sub-epic recursion handles `sub_epics:` list; DEFERRED sub-epics excluded from denominator.
- [ ] `cleargate sprint reconcile-lifecycle --parents` produces the same diff outside of close (read-only).
- [ ] Tests cover four parent-shapes: full coverage → flip; partial coverage → halt; zero-children → halt; sub-epic structure with DEFERRED → denominator correctly excludes.
- [ ] Live + canonical `close_sprint.mjs` in sync (`diff` returns empty).
- [ ] Smoke run on current repo enumerates the six stale Epics with auto-flip on EPIC-016 (6/6) and halts on EPIC-010 (7/8), EPIC-021 (0/0), EPIC-023 (4 in sub-epic 1 / placeholders elsewhere).

---

## Existing Surfaces

> L1 reuse audit. This CR extends existing reconciler infrastructure rather than introducing a parallel path.

- **Surface:** `.cleargate/scripts/close_sprint.mjs` Step 2.6a — invokes `cleargate sprint reconcile-lifecycle <sprint-id>` (line 297–340). Leaf-orphan check reads sprint state files such as `.cleargate/sprint-runs/SPRINT-27/state.json` and surfaces stories Done there but still in pending-sync.
- **Surface:** `.cleargate/scripts/close_sprint.mjs` Step 2.6b — `reconcileCrossSprintOrphans` from `cleargate-cli/dist/lib/lifecycle-reconcile.js` (line 356–398). Same leaf scope, cross-sprint.
- **Surface:** `cleargate-cli/src/commands/sprint.ts` `reconcileLifecycleHandler` — CLI entry-point invoked from Step 2.6a.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` (TERMINAL_STATUSES at line 28: `Done`, `Completed`, `Verified`) — source of truth for terminal set; reused by Q2 resolution.
- **Coverage of this CR's scope:** ~70% — extends the reconciler with parent rollup; no new top-level gate or script.

## Why not simpler?

- **Smallest existing surface that could carry this CR:** the `reconcileCrossSprintOrphans` function itself, by adding a `parentRollup: true` mode.
- **Why isn't extension sufficient?** Parent rollup needs a different scan (walk all parents in pending-sync, fetch all their children from archive) versus the current "walk all closed-sprint state.json entries, fetch the corresponding pending-sync file" shape. Same intent, different traversal — cleaner as a sibling `rollUpParentStatus()` helper than as a flag on the leaf reconciler.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium — three Open Questions outstanding**

Requirements to pass to Green:
- [ ] Q1 (auto-flip vs warn-only) resolved
- [ ] Q2 (terminal-state set) resolved
- [ ] Q3 (pre-Gate-4 vs post-Gate-4) resolved
- [ ] Sub-epic rollup behavior (§2 Blast Radius bullet on EPIC-023) confirmed
