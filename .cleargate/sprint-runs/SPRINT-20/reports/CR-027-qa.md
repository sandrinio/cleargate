# CR-027-qa — QA Report

QA: PASS
ACCEPTANCE_COVERAGE: 7 of 9 Gherkin scenarios have matching tests
MISSING: §4.6 (discovery-checked predicate fires) — delegated to CR-028 per M5 plan; §4.7 (risk-table-populated fires) — partial gap (see below)
REGRESSIONS: none

---

## Verification

**Commit:** `26a6e63` on branch `story/CR-027`  
**Mode:** LIGHT (test re-run skipped per orchestrator instruction; Developer reported vitest=18 passed, clean typecheck)

### Typecheck
TYPECHECK: pass (per Developer report; re-run skipped per orchestrator instruction)

### Tests
TESTS: 18 passed, 0 failed, 0 skipped (full suite, per Developer report; re-run skipped per orchestrator instruction)

---

## File-surface compliance

All 13 files in the commit are on-surface per CR-027 §3.1 + the 4 SDR-mandated additions:

| File | Status |
|---|---|
| `cleargate-cli/src/commands/sprint.ts` | +~300 LOC helpers + check entry + "five checks" string |
| `cleargate-cli/test/commands/sprint-preflight.test.ts` | +6 new scenarios + 3 fixture string updates + seedReadinessFixture helper |
| `.cleargate/knowledge/readiness-gates.md` | +20 LOC: discovery-checked ×5 + sprint.ready-for-execution gate |
| `cleargate-planning/.cleargate/knowledge/readiness-gates.md` | mirror, +20 LOC identical hunks |
| `.cleargate/scripts/assert_story_files.mjs` | export keywords on lines 74+90; --emit-json block ~22 LOC |
| `cleargate-planning/.cleargate/scripts/assert_story_files.mjs` | byte-equal mirror |
| `.claude/skills/sprint-execution/SKILL.md` | present on disk (gitignored); edited to "Five checks" — verified at lines 116-130 |
| `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` | committed; "Five checks" + new check #5 + resolution bullet |
| `.cleargate/knowledge/cleargate-protocol.md` | Gate 3 prose updated to five checks + CR-027 attribution |
| `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` | byte-equal mirror |
| `CLAUDE.md` | "five checks" edit at line 123, inside CLEARGATE block |
| `cleargate-planning/CLAUDE.md` | byte-equal mirror at line 32 |
| `cleargate-planning/MANIFEST.json` | regenerated (SKILL.md sha256, protocol sha256, readiness-gates sha256, developer.md sha256 picked up from Wave-1 delta) |
| `.cleargate/FLASHCARD.md` | 3 cards prepended (newest-first), dated 2026-05-02 |

No off-surface edits found.

---

## Gherkin scenario coverage

| CR-027 §4 scenario | Test | Status |
|---|---|---|
| §4.1 v2 happy path → exit 0, "all five checks pass" | Scenario 9 | COVERED |
| §4.2 v2 hard-block on EPIC pass=false → exit 1, stderr names ID + criterion | Scenario 10 | COVERED |
| §4.3 staleness (last_gate_check < updated_at) → exit 1 | Scenario 11 | COVERED |
| §4.4 v1 mode warns → exit 0 | Scenario 12 | COVERED |
| §4.5 Done items skipped from failure list | Scenario 13 | COVERED |
| §4.6 discovery-checked predicate fires on null context_source | Delegated to CR-028 per M5 §acceptance-mapping | DELEGATED — not a defect |
| §4.7 risk-table-populated fires on sprint plan with no risk table | Scenario 14 (see gap note) | PARTIAL — see below |
| §4.8 protocol + CLAUDE.md alignment (manual) | Live file inspection at QA gate | VERIFIED manually |
| §4.9 scaffold mirror diffs empty | diff assertions at QA gate | VERIFIED — see mirror section |

---

## §4.7 Gap note (risk-table-populated)

**Claim in M5 plan:** Scenario 14 = "sprint plan with no risk table fails check #5 with `risk-table-populated`."

**What Scenario 14 actually tests:** Sprint plan `cached_gate_result.pass: null` (no gate check ever ran) → preflight exits 1, stderr contains `SPRINT-99` and `no cached_gate_result`.

**Actual gap:** Scenario 14 does NOT exercise the `risk-table-populated` predicate evaluating to false. A sprint plan that has `cached_gate_result.pass: false, failing_criteria: [{id: "risk-table-populated"}]` is not tested. The predicate DEFINITION is present in `readiness-gates.md`, but the end-to-end path (gate check reads the body, evaluates `body contains '| Mitigation'`, stores `risk-table-populated` in `failing_criteria`, then preflight reads that result) is not exercised by any vitest scenario.

**Severity assessment:** Medium. The predicate is defined correctly; the gate engine that evaluates it (`readiness-predicates.ts`) is unchanged per M5 plan (verified: no edits to that file). The composite preflight wiring IS tested end-to-end in Scenarios 10-11 for the false/stale cases. The specific `risk-table-populated` criterion ID would only appear in stderr when a prior `cleargate gate check` run has stored it in frontmatter. The gap is that no test mocks a sprint plan file with `failing_criteria: [{id: "risk-table-populated"}]` and asserts preflight surfaces that ID.

**Resolution at QA:** Accepted as a known gap per the M5 mapping decision — the M5 plan explicitly mapped §4.7 to Scenario 14 and the orchestrator controls M5 scope. File a follow-up flashcard.

---

## Accepted deviations

**vitest-vs-node:test split:** The 6 new acceptance scenarios (Scenarios 9-14) were added to the existing `cleargate-cli/test/commands/sprint-preflight.test.ts` in vitest style. The Architect's M5 plan explicitly authorizes this: "this file is EXISTING vitest-style. ADD scenarios in vitest-style. Do NOT codemod to `node:test`." CR-029's batch codemod will migrate these alongside the rest in the SPRINT-20→SPRINT-21 gap. Not a defect.

---

## Key implementation verification

### assert_story_files.mjs export keywords
- Line 74: `export function extractWorkItemIds(text)` — confirmed.
- Line 90: `export function findWorkItemFile(repoRoot, workItemId)` — confirmed.
- `--emit-json` flag: block at line 210-229, reads file → extracts deliverables section → writes `{ workItemIds }` JSON → exits 0. No regression to existing call path (flag-absent = byte-identical behavior).

### sprint.ts check #5 implementation
- `readCachedGateSync`: handles `{pass: null, ...}` shape → returns `null` (GOTCHA-4 correct). Condition: `c['pass'] === null || c['pass'] === undefined → return null`.
- Fail rule: `cachedGate === null → 'no cached_gate_result'` first, then `cachedGate.pass !== true → 'pass=false'`, then staleness. Correct: covers both literal-null and absent cases (GOTCHA-4 + GOTCHA-5).
- `TERMINAL_STATUSES` reused from line 39 constant — no re-declaration.
- Sprint plan self-check: runs after the child loop, uses sprint ID (e.g., `SPRINT-99`) as the failure ID — matches scenario 14's assertion.
- v1 short-circuit: returns `{pass: true, skipped: true, message: 'skipped (execution_mode: v1 — advisory only)'}` — correct.
- `checkPerItemReadinessGates` added as fifth element in checks array at line 1399.
- "all five checks pass" success-line at line 1341 — updated.

### Mirror parity
- `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` → 2 lines only (pre-existing `section(3)/section(5)` vs `section(2)/section(4)` divergence). Zero new divergence in the appended sections. Pre-existing divergence preserved per M5 GOTCHA-2.
- `diff .cleargate/knowledge/cleargate-protocol.md cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` → empty.
- `diff .cleargate/scripts/assert_story_files.mjs cleargate-planning/.cleargate/scripts/assert_story_files.mjs` → empty.
- `diff cleargate-planning/.claude/skills/sprint-execution/SKILL.md cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` → empty.
- `diff cleargate-planning/.cleargate/knowledge/readiness-gates.md cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md` → empty.

### §-numbering stability (protocol.md)
`grep -c "^## [0-9]"` = 16 pre and post. No structural change.

### CLAUDE.md edit location
"Sprint Execution Gate" paragraph at line 123 — inside `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block (bounded at lines 98-159). Correct per M5 §file-6 constraint.

### Five-checks literal updates in tests
- Line 193 (Scenario 1): `'all five checks pass'` — updated.
- Line 298 (Scenario 6): `'2/5 checks failed'` — updated.
- Line 347 (Scenario 8): `'all five checks pass'` — updated.

---

## VERDICT

Ship it. All 13 files land on-surface. The composite gate (check #5) is correctly wired: v2 hard-blocks on any in-scope item with `null`, `pass=false`, or stale gate result; v1 skips; terminal-status items bypass the check; the sprint plan itself is self-checked. Mirror diffs match expectations (only the pre-existing 2-line divergence in readiness-gates, zero new divergence). Flashcard cards appended. MANIFEST regenerated.

One narrow gap: §4.7 (`risk-table-populated` fires) is not directly tested at the predicate level in Scenario 14 — the scenario tests the null-gate-result path, not the `risk-table-populated` criterion ID appearing in stderr. This is a gap accepted by the M5 mapping decision; file a follow-up flashcard for the next QA reviewer. It does not block ship.

§4.6 (`discovery-checked` predicate) is explicitly delegated to CR-028's adjacent test additions per M5 §acceptance-mapping; not a defect in this CR.

---

flashcards_flagged:
  - "2026-05-02 · #qa #gherkin #coverage · CR-027 §4.7: Scenario 14 tests null-gate-result, not risk-table-populated criterion ID in stderr — partial §4.7 gap; follow up in SPRINT-21 test."
