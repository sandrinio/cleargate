---
cr_id: CR-023
parent_ref: SPRINT-17 cleanup follow-ups; cleargate-protocol.md (citations) + .cleargate/templates/ + cleargate-cli/test/scripts/test_close_sprint_v21.test.ts + cleargate-cli/test/scripts/protocol-section-24.test.ts + vitest worker hygiene
parent_cleargate_id: "SPRINT-17 cleanup follow-ups; cleargate-protocol.md (citations) + .cleargate/templates/ + cleargate-cli/test/scripts/test_close_sprint_v21.test.ts + cleargate-cli/test/scripts/protocol-section-24.test.ts + vitest worker hygiene"
sprint_cleargate_id: SPRINT-18
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: "SPRINT-17 REPORT.md §5 Tooling rows + flashcard candidates surfaced 2026-05-01. Four cleanup items folded into one fast-lane CR per user 2026-05-01 ('we need it in the sprint'). Items: (a) stale §-citations in .cleargate/templates/ that M2 citation-rewrite scope missed; (b) pre-existing CLAUDE.md mirror divergence (4 canonical-only bullets); (c) stale protocol-section-N.test.ts files referencing pre-slim §-IDs; (d) vitest worker-leak hygiene (close-sprint tests fail in full-suite due to worker contention, pass in isolation)."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T20:30:00Z
  reason: "Direct approval pattern. CR-023 aggregates four cleanup items already documented in SPRINT-17 REPORT.md §5 Tooling (Yellow rows) + improvement-suggestions.md SUG-SPRINT-17-{01,03,06,08,09}. User 2026-05-01: 'we need it in the sprint' — confirming SPRINT-18 placement. No new design decisions; all four items are de-risked (root causes identified in SPRINT-17 REPORT)."
approved: true
owner: sandrinio
target_date: SPRINT-18
created_at: 2026-05-01T20:45:00Z
updated_at: 2026-05-01T20:45:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T11:15:51Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-023
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T11:15:51Z
  sessions: []
---

# CR-023: SPRINT-17 Cleanup — Stale Citations + Mirror Drift + Test Hygiene

**Lane:** `fast` — passes all 7 lane-rubric checks (no schema/migration; no shared file with EPIC-025 stories; no CLI surface change; doc + test fixture edits only; bounded surface; mechanical changes; verifiable via test re-run).

## 0.5 Open Questions

- **Question:** Item (b) CLAUDE.md mirror reconciliation — which version is canonical? Live has 35 lines in CLEARGATE-block; canonical has 39 (4 extra: "Readiness gates advisory-by-default" extension, "State-aware surface" bullet, "Cross-project orchestration" bullet, plus an extension to "Halt at gates").
  **Recommended:** **Adopt canonical as the source of truth** — those 4 bullets are content the canonical mirror was authored to carry as the seed-content for `cleargate init`. Live has drifted by losing them (likely an earlier edit pruned without mirror parity). Reconcile by adding the 4 bullets to live.
  **Human decision:** _accept recommended unless objection — alternative is to delete from canonical and accept that `init` ships without those 4 rules_

- **Question:** Item (d) vitest worker hygiene — fix via `pool: 'forks'` config in vitest.config.ts (process isolation, slower) or by adding `afterAll` cleanup hooks (faster, fragile)?
  **Recommended:** **`pool: 'forks'`** — process isolation is the durable fix; the FLASHCARD `2026-04-19 #vitest #worktree` already documents the leak as a worker-state issue. Slower full-suite runtime is acceptable for CI; close-sprint tests are the affected suite and run in <10s isolated.
  **Human decision:** _accept recommended_

- **Question:** Item (c) stale `protocol-section-N.test.ts` files — fix the §-IDs (e.g., `protocol-section-24.test.ts` → reference §9) or archive the test entirely (the slim protocol moved §24 to enforcement.md anyway)?
  **Recommended:** **Archive** the truly-stale ones (assertions about sections that no longer exist in `cleargate-protocol.md`); **renumber** the ones whose semantics still apply to a moved section. Per-test triage; expect ~2 archive + ~1-2 renumber in the file set.
  **Human decision:** _accept recommended; surface specifics in implementation_

## 1. The Context Override

### 1.1 What to remove / forget

This CR retires **four items of legacy state** that SPRINT-17 left behind:

1. **Stale `§24` / `§20` / `§9` / `§6` references in `.cleargate/templates/`** — STORY-024-02's M2 citation-rewrite scope did not include the templates directory. As a result, `Sprint Plan Template.md`, `sprint_report.md`, and `story.md` (line 32 + line 120) carry pre-slim §-IDs that don't resolve to anything in the post-slim `cleargate-protocol.md`. Fail-mode: a Developer reading `story.md` line 32+120 and trying to look up "§24 Lane Routing" finds nothing because Lane Routing moved to `cleargate-enforcement.md §9`.
2. **Pre-existing CLAUDE.md live↔canonical divergence** (4 canonical-only bullets). SPRINT-17 STORY-024-03 explicitly scoped its mirror-parity Gherkin to "the 4 new bullets only" because pre-existing divergence was out of scope. SPRINT-17 REPORT §4 flashcard `2026-05-01 #mirror #parity #invariant` documents this. The 4 missing-from-live bullets are: (i) "Readiness gates advisory-by-default" extension to "Halt at gates", (ii) "State-aware surface", (iii) "Cross-project orchestration", (iv) tier-4 extension to "Halt at gates".
3. **`protocol-section-N.test.ts` files reference pre-slim §-IDs.** Specifically `protocol-section-24.test.ts` asserts content at §24 of `cleargate-protocol.md` — but §24 moved to `cleargate-enforcement.md` §9 in STORY-024-02. SPRINT-17 QA flagged this; full-suite runs surface the test as failing.
4. **Vitest worker leak / contention.** `test_close_sprint_v21.test.ts` Scenarios 2/3/6 + `close-sprint-reconcile.test.ts` Scenario 1 pass in isolation but fail in full-suite runs. SPRINT-17 REPORT §5 Tooling row + flashcard `2026-05-01 #qa #vitest #npx` document the symptom: vitest workers leak ~30 GB RAM; subsequent suites contend on shared state. Full-suite runs report 17 failures across 69 files; ≥4 of those are vitest contention, not logic bugs.

### 1.2 The new truth (post-CR)

- **Templates carry valid §-citations.** All `§24` / `§20` / `§9` / `§6` references in `.cleargate/templates/{Sprint Plan Template,sprint_report,story}.md` (+ canonical mirrors) point at the correct post-slim location: `cleargate-enforcement.md §9` (Lane Routing) and similar.
- **CLAUDE.md live and canonical are byte-identical.** The 4 canonical-only bullets are added to live. Going forward, the SPRINT-17-deferred reconciliation work is closed.
- **`protocol-section-N.test.ts` files reflect the post-slim layout.** Stale ones are archived under `cleargate-cli/test/scripts/_archive/` (with a top-of-file note); renumbered ones cite the correct file (`cleargate-enforcement.md`) and §-ID.
- **Vitest pool config = `forks`** — process isolation eliminates worker contention. Full-suite runs reproduce the same green status as isolated suite runs.

## 2. Blast Radius & Invalidation

### 2.1 Surfaces directly modified

| Surface | What changes | Item |
|---|---|---|
| `.cleargate/templates/Sprint Plan Template.md` (+ canonical) | §-citation rewrites (~3 hits per file based on SPRINT-17 REPORT) | (a) |
| `.cleargate/templates/sprint_report.md` (+ canonical) | §-citation rewrites | (a) |
| `.cleargate/templates/story.md` (+ canonical) | §-citation rewrites at lines 32 + 120 | (a) |
| `CLAUDE.md` | Add 4 canonical-only bullets to CLEARGATE-tag-block region | (b) |
| `cleargate-cli/test/scripts/protocol-section-24.test.ts` | Archive or renumber per §0.5 triage | (c) |
| Other `protocol-section-*.test.ts` files (audit) | Renumber where stale | (c) |
| `vitest.config.ts` (root + cleargate-cli/) | Add `pool: 'forks'` config | (d) |

**Total:** ~10 file edits (8 surfaces, ~4 mirror pairs).

### 2.2 Documents reverted to 🔴

**None.** No in-flight item has frontmatter that depends on these specific stale citations or test files.

### 2.3 Backwards-compat carve-outs

- Pre-existing canonical-only bullets in CLAUDE.md (item b) — adopting the canonical version into live, not deleting from canonical. No content lost.
- Archived `protocol-section-*.test.ts` files retained under `_archive/` with a top-of-file note explaining the slim-protocol migration. No deletion of test history.

### 2.4 New CLI surface

None.

## 3. Execution Sandbox

### 3.1 Files modified / created

**Templates (live + canonical mirrors):**
- `.cleargate/templates/Sprint Plan Template.md`
- `.cleargate/templates/sprint_report.md`
- `.cleargate/templates/story.md`
- `cleargate-planning/.cleargate/templates/Sprint Plan Template.md`
- `cleargate-planning/.cleargate/templates/sprint_report.md`
- `cleargate-planning/.cleargate/templates/story.md`

**CLAUDE.md:**
- `CLAUDE.md` (live edit; canonical untouched — it already has the 4 bullets)

**Tests:**
- `cleargate-cli/test/scripts/protocol-section-24.test.ts` (archive or renumber)
- (Audit pass) Other `cleargate-cli/test/scripts/protocol-section-*.test.ts` files

**Vitest config:**
- `vitest.config.ts` (root) and/or `cleargate-cli/vitest.config.ts` — add `pool: 'forks'`.

**Total:** ~10 files.

### 3.2 Edit blueprint per item

**Item (a) — template §-citations:**
1. `grep -n "§24\|§20" .cleargate/templates/*.md cleargate-planning/.cleargate/templates/*.md` to enumerate hits.
2. For each hit, look up the post-slim location in `cleargate-enforcement.md` (§9 Lane Routing, etc.) and rewrite.
3. Apply identically to canonical mirrors.

**Item (b) — CLAUDE.md mirror reconcile:**
1. `diff CLAUDE.md cleargate-planning/CLAUDE.md` to enumerate the 4 canonical-only bullets.
2. Insert each bullet into live `CLAUDE.md` at the same position it appears in canonical.
3. Verify `diff` empty post-edit.

**Item (c) — `protocol-section-N.test.ts` triage:**
1. List all files matching `cleargate-cli/test/scripts/protocol-section-*.test.ts`.
2. For each: read its assertion target. If the §-ID still exists in `cleargate-protocol.md`, no change. If it moved to `cleargate-enforcement.md`, renumber + change file path. If the section was deleted, archive.
3. Re-run the suite to confirm all remaining tests pass.

**Item (d) — vitest worker hygiene:**
1. Add `pool: 'forks'` to `vitest.config.ts` (root level for the workspace).
2. Re-run full-suite vitest; confirm `test_close_sprint_v21.test.ts` Scenarios 2/3/6 + `close-sprint-reconcile.test.ts` pass in full-suite runs (currently fail).
3. Document the choice in a comment block above the config: "process isolation prevents worker leaks observed in SPRINT-17 (FLASHCARD 2026-05-01 #qa #vitest)".

### 3.3 Order of edits

Items are independent; can land in any order, in one commit. Suggested order: (b) CLAUDE.md mirror reconcile → (a) template citations → (c) protocol-section-N audit → (d) vitest config — leaves the test suite as the final verification step.

## 4. Verification Protocol

### 4.1 Gherkin acceptance scenarios

```gherkin
Feature: SPRINT-17 cleanup

  Scenario: Template §-citations are valid (item a)
    Given CR-023 has merged
    When grep -E "§24|§20" .cleargate/templates/ runs
    Then there are zero hits
    And every §-citation in the templates resolves to an existing section in cleargate-protocol.md or cleargate-enforcement.md

  Scenario: CLAUDE.md mirror parity (item b)
    Given CR-023 has merged
    When `diff CLAUDE.md cleargate-planning/CLAUDE.md` runs over the CLEARGATE-tag-block region
    Then the diff is empty

  Scenario: protocol-section-N.test.ts files are valid (item c)
    Given CR-023 has merged
    When the cleargate-cli test suite runs in isolation against `protocol-section-*.test.ts`
    Then exit code is 0
    And no test asserts content at a §-ID that no longer exists

  Scenario: Vitest full-suite runs without worker contention (item d)
    Given CR-023 has merged
    When `vitest run` runs from the repo root with no isolation flags
    Then test_close_sprint_v21.test.ts Scenarios 2/3/6 pass
    And close-sprint-reconcile.test.ts Scenario 1 passes
    And full-suite vitest exit code is 0 (modulo unrelated pre-existing failures in admin/ and mcp/ workspaces, which are out-of-scope per §2.3)

  Scenario: No regression on EPIC-025 surfaces
    Given CR-023 has merged
    When STORY-025-04 (template reframe) lands afterward
    Then STORY-025-04's mirror parity tests pass on top of CR-023's reconciled baseline
```

### 4.2 Manual verification steps

- [ ] Run `grep -rn "§24" .cleargate/templates/ cleargate-planning/.cleargate/templates/` — exit with no hits.
- [ ] Run `diff CLAUDE.md cleargate-planning/CLAUDE.md` — exit with empty diff (or scoped to non-CLEARGATE-tag-block content).
- [ ] Run `cd / && /Users/ssuladze/Documents/Dev/ClearGate/node_modules/.bin/vitest run` — exit with the close-sprint tests green.
- [ ] Inspect any archived `protocol-section-*.test.ts` files for top-of-file note explaining migration.

### 4.3 Definition of Done

- [ ] All 5 §4.1 Gherkin scenarios pass.
- [ ] `template-stubs.test.ts` (`Sprint Plan Template.md: live === mirror`) exits 0.
- [ ] `protocol-section-24.test.ts` either archived or passing.
- [ ] Full-suite vitest run reproduces isolated-suite green status for the 4 affected close-sprint scenarios.
- [ ] Commit message: `chore(SPRINT-18): CR-023 SPRINT-17 cleanup — stale citations + mirror drift + test hygiene`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green:
- [x] Approved Proposal exists (waived per `proposal_gate_waiver` frontmatter — direct approval pattern, user 2026-05-01 "we need it in the sprint").
- [x] §3 Execution Sandbox lists every file path explicitly (~10 files).
- [x] Downstream invalidation analysis complete (§2.2: zero items reverted to 🔴).
- [x] Verification Protocol covers every behavior change (5 Gherkin scenarios + 4 manual steps).
- [x] No "TBDs" remain.
