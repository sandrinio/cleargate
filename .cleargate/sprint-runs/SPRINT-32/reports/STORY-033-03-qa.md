# QA-Red Report — STORY-033-03

**Mode:** RED
**Story:** STORY-033-03 Architect Planning Workflow (SDR fan-out)
**Sprint:** SPRINT-32
**Date:** 2026-05-29

## RED Test File

- `cleargate-cli/test/scripts/collision-surface-planning-workflow.red.node.test.ts`

## Baseline Failure Run

Runner: `node --test --import tsx/esm`
Scope: `cleargate-cli/test/scripts/collision-surface-planning-workflow.red.node.test.ts`

All 15 leaf tests FAIL against the clean baseline (implementation absent).

### Leaf test failures (15/15)

| # | Test name | Fail reason |
|---|-----------|-------------|
| 1 | Bash Unit 1: column-1 path emitted | assertScriptExists — collision_surface.sh absent |
| 2 | Bash Unit 2: column-2 path emitted | assertScriptExists — collision_surface.sh absent |
| 3 | Bash Unit 3: non-path cells not emitted | assertScriptExists — collision_surface.sh absent |
| 4 | Bash Unit 4: comma-split multi-path | assertScriptExists — collision_surface.sh absent |
| 5 | Predicate 1: disjoint stories co-wave | fs.existsSync — architect-synth.md absent |
| 6 | Predicate 2: shared-surface pair serialized | fs.existsSync — architect-synth.md absent |
| 7 | Predicate 3: dep-predecessor ordering | fs.existsSync — architect-synth.md absent |
| 8 | Edge 1: N≤2 → single serial wave | fs.existsSync — architect-synth.md absent |
| 9 | Edge 2: unknown metadata fail-safe | fs.existsSync — architect-synth.md absent |
| 10 | Acceptance 1 (Sc1): fan-out collision-free waves | fs.existsSync — architect-reader.md and architect-synth.md absent |
| 11 | Acceptance 2 (Sc2): column-1 path emitted (bug fix) | assertScriptExists — collision_surface.sh absent |
| 12 | Acceptance 3 (Sc3): shared-surface serializes | fs.existsSync — architect-synth.md absent |
| 13 | Acceptance 4 (Sc4): N=2 tiny-sprint floor | fs.existsSync — architect-synth.md absent |
| 14 | Acceptance 5 (Sc5): unknown metadata fail-safe phrase | fs.existsSync — architect-synth.md absent |
| 15 | Acceptance bonus: agent files in live + canonical | fs.existsSync — architect-reader.md absent |

## Wiring Soundness (TPV pre-check)

- Imports: all node built-ins (node:test, node:assert/strict, node:fs, node:path, node:os, node:child_process, node:url) — resolve at runtime.
- No static import of absent modules.
- Script invoked via `spawnSync('bash', [COLLISION_SURFACE_SH, storyFilePath])` — no run_script.sh wrapper in tests (per M2 §STORY-033-03 Architect ruling).
- `beforeEach`/`afterEach` hooks present and correct (mkdtemp / rmSync).
- File naming: `*.red.node.test.ts` — correct.
- Test placement: `cleargate-cli/test/scripts/` — matches `test/**/*.node.test.ts` glob.

## BASELINE_FAIL: 15

---

## QA-VERIFY

**Mode:** VERIFY
**Story:** STORY-033-03 Architect Planning Workflow (SDR fan-out)
**Sprint:** SPRINT-32
**Dev commit:** 8c833e43
**QA date:** 2026-05-29

### Test Run

Command: `cd .worktrees/STORY-033-03/cleargate-cli && bash .cleargate/scripts/run_script.sh tsx --test test/scripts/collision-surface-planning-workflow.red.node.test.ts`

```
tests 15
pass  15
fail  0
skipped 0
duration_ms 743
```

All 15 QA-Red tests pass. No skips.

### Typecheck

`cleargate gate typecheck` (via `npm run typecheck`): exit 0, clean (zero errors).
No TypeScript source files were modified — story is bash scripts + markdown agent files + frontmatter field.

### Gherkin Scenario → Test Mapping

| Scenario | Test | Result |
|---|---|---|
| Sc1: Fan-out plans collision-free waves | Acceptance 1 (Sc1) | PASS |
| Sc2: collision_surface.sh reads paths from any column | Bash Unit 1 + Acceptance 2 (Sc2) | PASS |
| Sc3: Two-axis predicate serializes on any collision | Predicate 2 + Acceptance 3 (Sc3) | PASS |
| Sc4: Tiny-sprint floor falls back to sequential SDR | Edge 1 + Acceptance 4 (Sc4) | PASS |
| Sc5: Unknown collision metadata fails safe to serial | Edge 2 + Acceptance 5 (Sc5) | PASS |

All 5 §2.1 Gherkin scenarios covered.

### Implementation Verification

**collision_surface.sh correctness (multi-column bug fix):**
- Verified: `file_surface_diff.sh:173` still reads `val=cols[2]` (single-column bug UNCHANGED, untouched by this story).
- `collision_surface.sh` iterates `cols[1..n]` — all columns scanned. Live manual test: running against STORY-033-03 itself (§3.1 has both col1 and col2 paths) emits all 9 paths including column-1 paths.
- Non-path cells ("Yes", "No", "Yes/No", "N/A", "Item", "Value") correctly excluded.
- Comma-split multi-path cell emits each path separately.
- bash 3.2-portable: no `mapfile`, no `declare -A`, dedup via `awk '!seen[$0]++'`.

**waves.json contract shape:**
- architect-synth.md documents the exact shape: `{ "sprint": "...", "generated_at": "...", "waves": [{ "wave": "...", "stories": [...], "parallel": true|false, "rationale": "..." }] }`.
- Fail-safe-serialize exact phrase confirmed: `"unknown collision metadata — fail-safe-serialized"`.
- Tiny-sprint floor: always emit `waves.json` (one `parallel: false` serial wave) — documented in architect-synth.md.

**Dogfood parity:**
- `cleargate-planning/.claude/agents/architect-reader.md` — exists, byte-identical to npm payload (`cleargate-cli/templates/cleargate-planning/.claude/agents/architect-reader.md`). PASS.
- `cleargate-planning/.claude/agents/architect-synth.md` — exists, byte-identical to npm payload. PASS.
- `cleargate-planning/.claude/agents/architect.md` — SDR pointer block at line 104 (by anchor, non-destructive). Byte-identical to npm payload. PASS.
- `cleargate-planning/.cleargate/templates/story.md` — `db_write_set: []` advisory field at line 70, byte-identical to npm payload. PASS.
- `cleargate-planning/.cleargate/scripts/collision_surface.sh` — exists, byte-identical to live `.cleargate/scripts/collision_surface.sh`. PASS.
- `cleargate-planning/MANIFEST.json` — updated (new SHA entries for architect-reader.md, architect-synth.md, architect.md, collision_surface.sh, story.md). PASS.
- `architect.md` live↔canonical divergence NOT reconciled: `## Autonomy Contract` block (canonical :10) still present in canonical only. Expected, correct — per-edit parity, not whole-file reconciliation. PASS.
- Live `.claude/agents/` re-sync via `cleargate init` is a Gate-4 step — worktree `.claude/agents/` contains only the two new files (not architect.md, which is expected for the live gitignored instance). PASS.

### Pre-existing Failures (not caused by this story)

- `test/wiki/ingest.node.test.ts` — 1 failure (`require is not defined`, test bug from STORY-028-06 vitest→node:test conversion). Zero diff between parent commit and dev commit for this file.
- `test/wiki/lint-index-budget.node.test.ts` — 1 failure (stdout mismatch, pre-existing from STORY-028-06). Zero diff.
- `test/scripts/template-sync-fields.node.test.ts` — 2 failures (comma-operator JS bug in test file: `assert.ok(field in (fm, "string"))` where the comma operator reduces to `assert.ok(field in "string")` → TypeError). File last modified in STORY-028-06, not touched by this story. CR.md and Bug.md templates have the `pushed_by` field correctly.

None of these regressions originated from STORY-033-03.

### DoD Clause Audit

- [x] `collision_surface.sh` emits paths from ALL §3.1 columns — verified column-1 and column-2 paths emitted.
- [x] `architect-reader.md` and `architect-synth.md` exist with pinned digest + output schemas, canonical + npm payload.
- [x] Five-clause predicate documented in architect-synth.md; `waves.json` shape matches spec.
- [x] `db_write_set: string[]` advisory field in `story.md` frontmatter (line 70).
- [x] Tiny-sprint floor (N≤2 → single sequential SDR) and fail-safe-serialize both documented and tested.
- [x] §4.1 minimum test counts met: 4 bash-unit + 3 predicate + 2 edge + 5 acceptance (+ 1 bonus) = 15 tests.
- [x] All 5 §2.1 Gherkin scenarios covered by passing tests.
- [x] Live `/.claude/` re-sync reminder: Gate-4 step (not per-story blocker) — acknowledged in commit message.

### Script Incidents

None. All `run_script.sh` invocations exited 0.

---

QA: PASS
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none (3 pre-existing failures confirmed pre-existing, zero diff to causative files)
