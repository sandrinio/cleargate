---
story_id: STORY-043-07
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
context_source: |
  WS3 of EPIC-043 (Framework Hygiene & Efficiency Remediation). Source-level review
  found recompileSynthesis() in wiki-ingest.ts rewrites all four synthesis pages on
  every per-edit ingest (comment: "all four — M3 over-recompiles"). This story makes
  the per-edit path incremental (partition-targeted + stamp-only skip) while keeping
  `cleargate wiki build` byte-identical as the correctness floor.
area: cli,wiki,perf
status: Completed
approved: true
ambiguity: 🟢 Low
complexity_label: L3
parallel_eligible: y
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:45Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-07
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:45Z
  sessions: []
---

# STORY-043-07: Incremental Wiki Synthesis Recompile

## 1. The Spec (The Contract)

### 1.1 User Story

As a **ClearGate agent editing delivery items during a running sprint**, I want **the per-edit wiki ingest to recompile only the synthesis page(s) actually affected by the changed item — and to recompile nothing at all when only frontmatter stamp fields changed** so that **a single story no longer pays dozens of redundant four-page synthesis rewrites, while a full `cleargate wiki build` stays byte-identical to today.**

### 1.2 Detailed Requirements

- `recompileSynthesis()` in `cleargate-cli/src/commands/wiki-ingest.ts` (lines ~660-678) currently rewrites **all four** synthesis pages (`active-sprint.md`, `open-gates.md`, `product-state.md`, `roadmap.md`) on **every** ingest. The code comment literally reads `// (all four — M3 over-recompiles)`. This story narrows that.
- Recompile **only** the synthesis page(s) whose partition the changed item's bucket belongs to. The bucket→page mapping (verified against the synthesis sources, see §3.1) is:
  - `sprints` → `active-sprint.md`, `product-state.md`, `roadmap.md`
  - `epics` → `product-state.md`, `roadmap.md`
  - `proposals` → `open-gates.md`, `product-state.md`
  - `stories` → `product-state.md`
  - `crs` → `product-state.md`
  - `bugs` → `product-state.md`
  - `initiatives`, `topics`, unknown → no synthesis page (recompile **none**)
- **Skip recompile entirely** when only frontmatter stamp fields changed and there is no body or status delta. Stamp fields are the sync/audit timestamps that never feed any synthesis page (e.g. `pushed_at`, `last_synced_*`, `last_pulled_*`, `last_remote_update`, `draft_tokens`, `cached_gate_result.last_gate_check`, the `updated_at*` stamps). A stamp-only edit MUST rewrite **zero** synthesis pages.
- The ingest call site (`recompileSynthesis(wikiRoot, cwd, templateDir)` at line ~314) must pass the changed item's id/bucket and a stamp-only signal so the function can target the right partition.
- **CORRECTNESS FLOOR (non-negotiable):** the output of a full `cleargate wiki build` (the complete rebuild path) MUST remain **byte-identical** before and after this change. The per-edit incremental path is an **optimization only** — it must never change what a full rebuild would produce.
- Add a **parity test** that asserts the incremental per-edit result is byte-identical to the full-rebuild result for the same corpus. If they diverge, the test fails with a clear "wiki synthesis drift" Error naming the divergent page.

### 1.3 Out of Scope

- Changing the full-rebuild path (`cleargate wiki build`) behavior — it stays a complete four-page rebuild and is the correctness floor, not a target for narrowing.
- The PostToolUse hook (`.claude/hooks/stamp-and-gate.sh`) that *invokes* ingest — unchanged; this story optimizes the work ingest does, not when the hook fires.
- The synthesis page recipes themselves (`cleargate-cli/src/wiki/synthesis/*.ts`) — their compile logic is unchanged; we only change which subset gets re-invoked per edit.
- Wiki config / `ingest_buckets` semantics, index/log writes (Steps 6-7), and Phase-4 contradiction check (Step 9) — untouched.
- WS1/WS2/WS4/WS5/WS6/WS7/WS8 of EPIC-043 — separate stories.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Incremental wiki synthesis recompile on per-edit ingest

  Scenario: Body edit recompiles only the changed item's partition
    Given a wiki has been built and all four synthesis pages exist
    When a single epic's body changes and the PostToolUse hook runs wiki ingest
    Then only product-state.md and roadmap.md are rewritten
    And active-sprint.md and open-gates.md are left untouched (mtime unchanged)

  Scenario: Frontmatter stamp-only edit recompiles zero synthesis pages
    Given a wiki has been built and all four synthesis pages exist
    When an item is re-ingested with only stamp fields changed (pushed_at, last_synced_*) and no body or status delta
    Then zero synthesis pages are rewritten
    And all four synthesis page mtimes are unchanged

  Scenario: Incremental result matches full rebuild byte-for-byte
    Given a corpus of sprints, epics, stories, and bugs
    When each item is ingested incrementally one at a time
    And then a full `cleargate wiki build` is run on the same corpus
    Then the four synthesis pages from the incremental path are byte-identical to the full-rebuild output

  Scenario: Incremental recompile drifts from full rebuild Error
    Given the incremental partition-targeting has a bug that skips a needed page
    When the parity test compares incremental output to the full `cleargate wiki build` output
    Then the test fails with a non-zero exit and a "wiki synthesis drift" Error naming the divergent page
    And the full rebuild remains the correctness floor (incremental change is rejected until parity is restored)
```

### 2.2 Verification Steps (Manual)

- [ ] Build a wiki in a fixture repo (`cleargate wiki build`); capture the four synthesis files' contents + mtimes.
- [ ] Edit one epic's body, run `cleargate wiki ingest <file>`; confirm only `product-state.md` and `roadmap.md` changed (mtime + content); `active-sprint.md` and `open-gates.md` unchanged.
- [ ] Re-ingest an item touching only stamp frontmatter (`pushed_at`); confirm all four synthesis pages are byte-unchanged (zero writes).
- [ ] Edit a sprint item; confirm `active-sprint.md`, `product-state.md`, `roadmap.md` rewrite and `open-gates.md` does not.
- [ ] Run `cleargate wiki build` after the incremental edits and diff against a fresh full rebuild from the same corpus — confirm byte-identical.
- [ ] Run `npm run typecheck` and `npm test` for `cleargate-cli` — all green, including the new parity test.

## 3. The Implementation Guide

### 3.1 Context & Files

- `cleargate-cli/src/commands/wiki-ingest.ts` — the only production file this story changes. Targets:
  - `recompileSynthesis()` (lines ~660-678) — currently unconditionally writes all four pages; the comment reads `// (all four — M3 over-recompiles)`. Add partition-targeting + a stamp-only fast-exit.
  - The call site at line ~314 (`recompileSynthesis(wikiRoot, cwd, templateDir);`, preceded by `// Step 8: Recompile affected synthesis pages (all four — M3 over-recompiles)`) — extend the signature to pass the changed item's bucket and a stamp-only flag.
- The bucket→page mapping is derived (read-only) from the synthesis recipe sources, which this story does NOT modify:
  - `cleargate-cli/src/wiki/synthesis/active-sprint.ts` — filters `i.bucket === 'sprints'`.
  - `cleargate-cli/src/wiki/synthesis/open-gates.ts` — filters `i.bucket === 'proposals'` (plus ready/blocked items).
  - `cleargate-cli/src/wiki/synthesis/product-state.ts` — counts buckets `['epics','stories','sprints','proposals','crs','bugs']`.
  - `cleargate-cli/src/wiki/synthesis/roadmap.ts` — filters `sprints` and `epics`.
- New parity test colocated with the CLI's wiki tests (`cleargate-cli/src/commands/wiki-ingest.*.node.test.ts` naming, `tsx --test`).

### 3.2 Technical Logic

1. Introduce a static `BUCKET_SYNTHESIS_MAP: Record<bucket, SynthesisPage[]>` derived from the four recipe filters above (single source of truth co-located with `recompileSynthesis`). Any bucket not in the map (`initiatives`, `topics`, unknown) maps to `[]` → no recompile.
2. Change `recompileSynthesis(wikiRoot, cwd, templateDir)` to also accept `{ bucket, stampOnly }`. The function:
   - If `stampOnly === true` → return immediately (zero writes).
   - Else compute `pages = BUCKET_SYNTHESIS_MAP[bucket] ?? []`; if empty → return (zero writes). The `scanRawItems`/`loadWikiConfig` scan is still performed once (state must reflect the whole corpus for the pages that DO recompile), but only the pages in `pages` are written via their existing `compile*` recipe + `fs.writeFileSync`.
3. Compute `stampOnly` at the call site: compare the new item's non-stamp body+status against the previously-ingested wiki page. Define the stamp-field set explicitly (`pushed_at`, `pushed_by`, `last_synced_*`, `last_pulled_*`, `last_remote_update`, `draft_tokens`, `updated_at`, `updated_at_version`, `server_pushed_at_version`, `cached_gate_result.last_gate_check`). If the only delta is within that set and the rendered body is unchanged → `stampOnly = true`. When in doubt (cannot read prior page, body parse fails) → fail safe to `stampOnly = false` (recompile the partition), never to skipping.
4. Keep the full-rebuild path (`cleargate wiki build`) calling a complete four-page recompile — it must stay the correctness floor. Refactor the four `compile*`+`writeFileSync` lines into a tiny `writePage(page)` helper so the incremental path and the full path share identical write logic (guaranteeing byte-identical output per page).
5. The parity test builds a fixed corpus, runs ingest incrementally for each item, snapshots the four synthesis files, then runs a full rebuild and asserts byte-equality per page; on mismatch it throws a "wiki synthesis drift: <page>" Error.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Scope | Expectation |
|---|---|---|
| Unit | `BUCKET_SYNTHESIS_MAP` lookup | Each bucket maps to the exact page set in §1.2; unknown/initiatives/topics → `[]`. |
| Unit | stamp-only detection | A stamp-field-only delta returns `stampOnly=true`; a body/status delta returns `false`; unreadable prior page → `false` (fail safe). |
| Integration | per-edit ingest | Editing an epic rewrites only `product-state.md`+`roadmap.md`; a sprint edit rewrites those plus `active-sprint.md`; a stamp-only edit rewrites zero pages (mtime assertions). |
| Integration (parity) | incremental vs full rebuild | Four synthesis pages from incremental edits are byte-identical to `cleargate wiki build` output; drift throws a named "wiki synthesis drift" Error. |
| Regression | `cleargate wiki build` | Full-rebuild output byte-identical to pre-change baseline for a fixture corpus. |

### 4.2 Definition of Done

- [ ] `recompileSynthesis()` recompiles only the changed item's partition pages; non-affected pages are not written.
- [ ] A frontmatter stamp-only edit (no body/status delta) writes zero synthesis pages.
- [ ] The `// (all four — M3 over-recompiles)` comments at lines ~313 and ~661 are removed/replaced to reflect the incremental behavior.
- [ ] A parity test asserts incremental output == full-rebuild output, failing with a clear named Error on drift.
- [ ] `cleargate wiki build` full-rebuild output is byte-identical before/after (correctness floor held).
- [ ] `npm run typecheck` clean and `npm test` green for `cleargate-cli`, including the new test.
- [ ] No change to synthesis recipes, the PostToolUse hook, config semantics, or any other EPIC-043 workstream's files.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story modifies, all verified by Read/grep on 2026-06-01.

- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:660-678` — `recompileSynthesis()` unconditionally writes all four synthesis pages (`active-sprint.md`, `open-gates.md`, `product-state.md`, `roadmap.md`) via `compileActiveSprint`/`compileOpenGates`/`compileProductState`/`compileRoadmap` + `fs.writeFileSync`. The leading comment is literally `// Recompile all four synthesis pages`. This story narrows it. (Verified by Read.)
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:313-314` — the Step-8 call site, comment `// Step 8: Recompile affected synthesis pages (all four — M3 over-recompiles)`, calls `recompileSynthesis(wikiRoot, cwd, templateDir)` with no item context. This story extends the signature. (Verified by Read.)
- **Surface:** `cleargate-cli/src/wiki/synthesis/active-sprint.ts:16` (`state.filter((i) => i.bucket === 'sprints')`), `open-gates.ts:26` (`i.bucket !== 'proposals'`), `product-state.ts:36` (`['epics','stories','sprints','proposals','crs','bugs']`), `roadmap.ts:25-26` (`sprints`, `epics`) — the read-only source of the bucket→page partition map; NOT modified, only consulted to build `BUCKET_SYNTHESIS_MAP`. (Verified by grep.)
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:75` — `BUCKET_ORDER` const enumerates the bucket vocabulary the new map keys off. (Verified by grep.)
- **Coverage:** ~100% in-place narrowing of one existing function + its single call site; no net-new module, command, or abstraction beyond a local lookup map and a colocated test.

## Why not simpler?

- **Smallest existing surface:** the existing `recompileSynthesis()` function and its single Step-8 call site in `cleargate-cli/src/commands/wiki-ingest.ts` — this story edits exactly that surface plus a colocated parity test, building no new module.
- **Why isn't extension/config sufficient?** A config flag (e.g. "recompile fewer pages") cannot decide *which* pages an arbitrary edit affects — the affected set depends on the changed item's bucket, which is runtime data, not configuration. The narrowing logic (bucket→partition map + stamp-only detection) must live in code at the ingest path. We deliberately avoid the heavier alternative (a generalized dependency-graph/dirty-tracking engine across all wiki pages): the four synthesis pages have a fixed, statically-known bucket dependency, so a small literal lookup map plus a fail-safe stamp-only guard is the minimum that satisfies the requirement without a new abstraction. The full-rebuild path stays untouched as the correctness floor, so the optimization can never silently corrupt output.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — Ready for Coding Agent**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green:
- [x] Parent EPIC-043 has `approved: true` (verified in epic frontmatter).
- [x] §1 spec, §2 Gherkin (happy path + named Error path), and §2.2 manual checklist are present and unambiguous.
- [x] §3.1 cites only this story's real, grep/Read-verified file paths (`cleargate-cli/src/commands/wiki-ingest.ts` + read-only synthesis sources).
- [x] §3.2 technical logic is concrete (bucket→page map, stamp-only fast-exit, shared `writePage` helper, parity test).
- [x] §4 declares minimum test expectations (table) and a Definition-of-Done checklist.
- [x] §Existing Surfaces cites at least one source-tree path with file:line.
- [x] §Why not simpler? answers both sub-bullets (smallest surface + why config/extension is insufficient).
- [x] 0 "TBD"s in the document.
