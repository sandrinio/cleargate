---
cr_id: CR-014
parent_ref: EPIC-013
status: Approved
sprint: null
milestone: null
complexity: L2
approved: true
approved_at: 2026-04-27T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-27T00:00:00Z
updated_at: 2026-04-27T00:00:00Z
created_at_version: cleargate@0.6.0
updated_at_version: cleargate@0.6.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-27T06:05:12Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  User question 2026-04-27 surfaced a real gap in sprint-start decomposition checks.
  Verified pre-CR by reading `.cleargate/scripts/assert_story_files.mjs:55-58`: the
  ID extractor regex is `/STORY-\d+-\d+/g` only — CR/BUG/EPIC/PROPOSAL/HOTFIX prefixes
  are invisible to the gate. SPRINT-13 shipped 4 CRs without ever invoking the gate
  against any of them. SPRINT-14 §1 deliverables listed 3 CRs + 2 Bugs alongside
  STORY-022-XX; only the STORY-prefix items got existence-checked.

  Same regex-too-narrow lesson as BUG-009 (token-ledger detector) and BUG-010
  (mis-attribution scope). Filed as off-sprint CR rather than SPRINT-15 work item
  because (a) the fix is bounded to one helper function + one assertion module,
  and (b) it affects every future sprint-init invocation. Cost of waiting one
  sprint = at least one more SPRINT-15 kickoff with the same bypass dance.
proposal_gate_waiver: |
  User direct request 2026-04-27 ("create CR and implement it without sprint") —
  sharp intent + inline reference (the assert_story_files.mjs evidence). Standing
  rule per feedback_proposal_gate_waiver: skip retro-proposal when user asks
  directly with sharp intent + inline reference; record waiver here.
stamp_error: no ledger rows for work_item_id CR-014
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-27T06:05:12Z
  sessions: []
---

# CR-014: Sprint-Init Gate — Multi-Type Decomposition Check

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `assert_story_files.mjs` line 56 hard-coded regex `/STORY-\d+-\d+/g`. Treats CR/BUG/EPIC/PROPOSAL/HOTFIX items in `## 1. Consolidated Deliverables` as invisible.
- The unspoken-but-documented assumption that sprints decompose only into Stories. Multiple shipped sprints (SPRINT-13: 4 CRs; SPRINT-14: 3 CRs + 2 Bugs + 8 Stories + 1 standalone Story + 1 dogfood) prove that's not how the framework is actually used.
- "File existence is sufficient evidence of decomposition." A `STORY-NNN-NN_*.md` with empty body and `approved: false` passes today's gate equally with a fully-written approved one.

**New Logic (The New Truth):**

The decomposition check fires on **all six work-item id shapes** that the framework recognises (per the BUG-010 detector contract): `STORY-\d+-\d+`, `CR-\d+`, `BUG-\d+`, `EPIC-\d+`, `(PROPOSAL|PROP)-\d+`, `HOTFIX-\d+`. PROP↔PROPOSAL normalisation per BUG-009.

Two assertions per matched id, both enforced under `execution_mode: v2`:

1. **File exists** — `pending-sync/<ID>_*.md` resolves to exactly one file (existing behavior, extended to all id shapes).
2. **File is approved + structurally non-empty** — frontmatter parses cleanly, contains `approved: true`, AND the body has at least one `## ` markdown heading (proves the file is not a stub).

Under `execution_mode: v1`, missing/unapproved/empty items emit warnings only (preserves backwards compat with pre-EPIC-013 sprints).

**Scope cut (deferred to a follow-up):** the chicken-and-egg fix (two-phase init: `--skeleton` to bootstrap state.json before Sprint Design Review, `--finalize` to commit it post-decomposition) is OUT of scope this CR. Filed as suggested follow-up `CR-015-suggested`. CR-014 ships only the regex+approval check.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: none — STORY-013-09 (Sprint Planning v2 Sprint Design Review) is unaffected by this CR; the Architect's emission contract doesn't change. The SDR still produces decomposed stories; this CR just enforces them at sprint init.
- [ ] Invalidate/Update Epic: EPIC-013 §15 (sprint-init contract) gets a one-line note in `.cleargate/knowledge/cleargate-protocol.md` that `assert_story_files` now covers all six id shapes. ≤3 lines added; both protocol mirrors stay byte-equal.
- [ ] Database schema impacts? **No.** Pure script-level change in `.cleargate/scripts/`.
- [ ] Audit log: no change.
- [ ] FLASHCARD impact: add card on completion — *"assert_story_files.mjs covers all six id shapes (STORY/CR/BUG/EPIC/PROPOSAL/PROP/HOTFIX) under v2; v1 still warns-only for backwards compat."*
- [ ] Manifest impact: `.cleargate/scripts/assert_story_files.mjs` — content sha changes; the prebuild on commit recomputes. No new files.
- [x] All impacted downstream items identified — STORY-013-09 unchanged; EPIC-013 §15 minor doc edit only.

## 3. Execution Sandbox

**Modify:**

- `.cleargate/scripts/assert_story_files.mjs`:
  - Rename `extractStoryIds` → `extractWorkItemIds`. Update the regex alternation to: `/(STORY-\d+-\d+|(CR|BUG|EPIC|HOTFIX)-\d+|(PROPOSAL|PROP)-\d+)/g`. Apply BUG-010's lesson: longest alternative first (STORY before CR/BUG/EPIC/HOTFIX, PROPOSAL before PROP) so prefix-collision is impossible.
  - Apply BUG-009's normalize: `PROP-NNN` → `PROPOSAL-NNN` post-extract.
  - Rename `findStoryFile` → `findWorkItemFile` (same logic, just clearer name).
  - Rename `assertStoryFiles` → `assertWorkItemFiles`.
  - Add `assertWorkItemApproved` helper that:
    - Reads the file at `findWorkItemFile`'s return path.
    - Parses YAML frontmatter (use the existing `js-yaml`-style helper if one is in `cleargate-cli/src/lib/`; otherwise inline a small frontmatter extractor — tolerate quoted/unquoted values).
    - Returns `{ approved: bool, has_heading: bool }`. `has_heading` is true iff the body (post-frontmatter) contains a `## ` line.
  - Compose: `assertWorkItemFiles` returns `{ missing, present, unapproved, empty }`. Under v2 mode, any of the four arrays being non-empty exits 1 with a structured stderr listing each category. Under v1, all four become warnings.
- `.cleargate/scripts/init_sprint.mjs`:
  - Update the assertion-failure error path to include the four-category breakdown, not just `missing`.
  - One-line change to the v2 hard-block message: `"v2 sprint init blocked — N items missing, N unapproved, N stub-empty. Fix the above, then re-run init."`
- `cleargate-planning/.cleargate/scripts/assert_story_files.mjs`: scaffold mirror — keep byte-identical to live.
- `cleargate-planning/.cleargate/scripts/init_sprint.mjs`: scaffold mirror — keep byte-identical to live.
- `.cleargate/knowledge/cleargate-protocol.md` + scaffold mirror: §15 (or wherever the EPIC-013 sprint-init contract lives) gains a 2-line note: *"As of cleargate@0.6.x, sprint-init asserts all six work-item id shapes. v2 mode hard-blocks on missing OR unapproved OR stub-empty items; v1 warns-only."* Both protocol mirrors must stay byte-equal post-edit (per STORY-014-01 round 2 lesson).
- `.cleargate/FLASHCARD.md`: append the lesson card on commit (one line, dated 2026-04-27).

**Tests required:**

- `cleargate-cli/test/scripts/test_assert_work_item_files.test.ts` — new vitest covering:
  1. STORY-only sprint (regression baseline) — all present + approved → exit 0.
  2. Mixed sprint (STORY + CR + BUG + EPIC + PROPOSAL + HOTFIX) — all present + approved → exit 0.
  3. PROP-NNN in §1 + PROPOSAL-NNN file exists — normalize matches → exit 0.
  4. Mixed sprint with one unapproved CR → exit 1, stderr names the unapproved id.
  5. Mixed sprint with one stub-empty Bug (frontmatter present, no `## ` headings) → exit 1, stderr names the empty id.
  6. v1 mode: same setup as #4 → warning emitted, exit 0.
- Fixture files under `cleargate-cli/test/scripts/fixtures/sprint-multi-type/` — minimal sprint markdown + per-id work-item files mocking each scenario.

**Cross-OS portability** (per BUG-010 §4b):
- Node fs APIs only.
- `path.join` for path construction.
- No GNU-only or BSD-only flags.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm test -- test_assert_work_item_files`

The 6 vitest scenarios above PASS on macOS bash 3.2 / Node 24. Manual smoke:

1. Run `node .cleargate/scripts/assert_story_files.mjs .cleargate/delivery/archive/SPRINT-13_Identity_Bound_Invite_Auth.md` (the SPRINT-13 archive file). Pre-CR: prints "no STORY-IDs found in §1" warning. Post-CR: detects 4 CRs (CR-003/004/005/006), confirms each archive file exists + approved + has headings, exits 0.
2. Run against SPRINT-14 archive: detects 3 CRs + 2 Bugs + 9 Stories + STORY-099-01, all archived, all approved, all structurally non-empty.
3. Try a synthetic broken sprint (STORY-999-01 referenced in §1 but file missing) → exits 1 with "1 missing" message.

**Pre-commit gates:**

- `cd cleargate-cli && npm run typecheck` clean.
- `cd cleargate-cli && npm test` green.
- `diff .cleargate/scripts/assert_story_files.mjs cleargate-planning/.cleargate/scripts/assert_story_files.mjs` returns empty.
- `diff .cleargate/scripts/init_sprint.mjs cleargate-planning/.cleargate/scripts/init_sprint.mjs` returns empty.
- Both protocol files byte-equal.
- Existing `init_sprint` + `close_sprint` tests still pass (no regression).
- Commit message: `feat(CR-014): off-sprint — assert_story_files covers all 6 id shapes + approved/structural check (v2 hard-block, v1 warn)`.
- One commit. NEVER `--no-verify`.

**Post-commit:**

- Move `.cleargate/delivery/pending-sync/CR-014_*.md` to `.cleargate/delivery/archive/`.
- Append flashcard line.
- Wiki re-ingest (PostToolUse hook handles automatically).

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — Ready for Developer**

Pass criteria — all met:
- [x] Approved (off-sprint per user direct request 2026-04-27).
- [x] §3 Execution Sandbox names exact files + behavior contract.
- [x] §4 Verification Protocol pins both vitest scenarios + manual smoke.
- [x] Blast radius bounded (script-level + 2-line protocol note).
- [x] Backwards-compat for v1 sprints preserved.
- [x] Scope cut documented (chicken-and-egg deferred to CR-015-suggested).
