---
cr_id: CR-027
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-02T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-02T00:00:00Z
updated_at: 2026-05-02T00:00:00Z
created_at_version: cleargate@0.6.x
updated_at_version: cleargate@0.6.x
server_pushed_at_version: null
context_source: |
  Conversation 2026-05-02 — user asked "how do we measure if we're not recreating
  something already exists during planning" then zoomed out to "make planning
  sessions produce production-ready system/code." Identified seven planning-quality
  dimensions (Discovery, Specification, Decomposition, Architecture, Risk, Evidence,
  Traceability) and three layered checkpoints (Triage / Artifact Gate / Sprint
  Readiness Gate). Prior-art audit:
    - EPIC-008 (Abandoned, but outputs shipped): predicate engine, `cleargate gate
      check`, `readiness-gates.md`, `cached_gate_result` frontmatter.
    - CR-010 (Completed): demoted server-side `cached_gate_result.pass` rejection
      to advisory at push.
    - CR-014 (Done): sprint-init asserts file existence + approval + non-empty
      body across all 6 id shapes; does NOT run gate predicates.
    - CR-008 (Completed): SessionStart planning-first reminder.
  The wire gap: sprint preflight runs 4 environment checks but does NOT execute
  the per-item readiness gates against the sprint's Consolidated Deliverables.
  This CR closes that gap and adds two new criteria covering Discovery and Risk
  (the dimensions absent from today's predicate set).
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T17:53:54Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: <synthetic>,claude-opus-4-7
  last_stamp: 2026-05-02T17:53:54Z
  sessions:
    - session: 7cc0804d-be00-4162-94c8-254046c19c1b
      model: <synthetic>,claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-02T14:19:01Z
---

# CR-027: Composite Planning Readiness — Per-Item Gate Check at Sprint Preflight + Discovery & Risk Criteria

## 0.5 Open Questions

- **Question:** Scope — ship the wire (composite gate at preflight) + 2 new criteria (`discovery-checked`, `risk-table-populated`) in one CR, or split into two CRs (wire first, criteria after)?
  - **Recommended:** one CR. The wire is meaningless without something new to enforce; the new criteria are uninteresting unless they fire somewhere. Pairing keeps the demo tight.
  - **Human decision (2026-05-02):** one CR — accepted. Pulled into SPRINT-20 alongside CR-028.

- **Question:** Severity of the new composite check at preflight — hard-block (exit 1) under v2, advisory (warn-only) under v1?
  - **Recommended:** match CR-014's posture exactly. v2 hard-blocks; v1 warns. Same enforcement contract as the existing decomposition check.
  - **Human decision (2026-05-02):** yes — mirror CR-014. v2 hard-block, v1 warn-only.

- **Question:** `discovery-checked` predicate — what counts as "discovery was done"?
  - **Recommended:** `frontmatter(.).context_source != null` (must be populated, not the literal `null`). Cheap; the agent fills `context_source` during triage anyway. Tighter alternative: `body contains 'wiki-query:'` to require an explicit citation. Tightest: a new predicate shape `frontmatter(.).context_source matches /\[\[[A-Z]+-\d+/` requiring at least one wiki cross-ref. Recommendation: start with the cheap form to avoid false negatives during rollout; tighten in a follow-up once it's measured.
  - **Human decision (2026-05-02):** agreed — ship cheap form (`frontmatter(.).context_source != null`). Tightening deferred to a follow-up CR after measurement.

- **Question:** `risk-table-populated` predicate — sprint plan only, or epic decomposition too?
  - **Recommended:** sprint plan only. Epics today have a §1 Problem section, not a structured risk table. Adding the criterion to epic gates would force a template change beyond this CR's scope.
  - **Human decision (2026-05-02):** yes — sprint plan only. Epic scope deferred.

- **Question:** Should the broader dimensions surfaced in conversation (Specification quality, Decomposition measurement, Architecture validation, Evidence grounding, Traceability) get follow-up CRs filed alongside, or wait?
  - **Recommended:** wait. Ship CR-027, measure how often preflight blocks, then file targeted CRs for the dimensions that show up as actual planning failures. Speculative criteria turn into noise.
  - **Human decision (2026-05-02):** ok — wait. Measure first, file targeted follow-ups based on real failure data.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `cleargate sprint preflight <id>` (`cleargate-cli/src/commands/sprint.ts:812-1095`) runs **four** environment-health checks: previous sprint Completed, no leftover worktrees, `sprint/S-NN` ref free, `main` clean. These are infrastructure checks. They do not validate the **content** of any work item the sprint will execute.
- The implicit assumption that "items in `## 1. Consolidated Deliverables` are ready because they exist + are approved + have a `## ` heading" (CR-014's check). File presence + approval flag + non-stub body is necessary but not sufficient; an Epic with `cached_gate_result.pass: false` is still in scope today.
- The framing in CLAUDE.md "Sprint Execution Gate" paragraph that lists exactly the four CR-021 checks. After this CR, there are five.
- The `discovery-checked` and `risk-table-populated` criteria are **absent** from `.cleargate/knowledge/readiness-gates.md` today — the predicate engine has no way to flag a draft that bypassed wiki-query at triage or a sprint plan with no risk table.

**New Logic (The New Truth):**

Two changes, paired:

**1. Composite gate at preflight (the wire).** `cleargate sprint preflight <id>` gains **check #5: per-item readiness gates pass for every item in scope**. Implementation:
- Parse the sprint plan file at `.cleargate/delivery/{pending-sync,archive}/SPRINT-NN_*.md`. Extract work-item IDs from `## 1. Consolidated Deliverables` using the existing `extractWorkItemIds` helper from `assert_story_files.mjs` (post-CR-014).
- For each ID, resolve its file via `findWorkItemFile` (existing). Read its `cached_gate_result.pass` from frontmatter.
- If any item's `pass !== true` (or `last_gate_check < updated_at`, indicating staleness), the check **fails** under v2 and **warns** under v1 — matching CR-014's severity model.
- Failure message lists each failing item with its failing criteria IDs (already cached in frontmatter), e.g.:
  ```
  ❌ Per-item readiness gates: 2/9 items not ready
     - EPIC-027: no-tbds, affected-files-declared
     - STORY-027-03: implementation-files-declared
     Run: cleargate gate check <file> -v   for each
  ```
- Items whose status is `Done` / `Completed` / `Abandoned` are skipped (carry-over already-shipped items remain valid).

**2. Two new criteria (the new dimensions).** Append to `.cleargate/knowledge/readiness-gates.md`:

- `discovery-checked` — added to all four enforcing types (`epic.ready-for-decomposition`, `story.ready-for-execution`, `cr.ready-to-apply`, `bug.ready-for-fix`). Predicate: `frontmatter(.).context_source != null`. Enforces that the agent recorded a triage rationale (wiki-query result, prior-art reference, or "no overlap found" note) before drafting. Catches the "agent skipped triage" failure mode behind the user's original question.
- `risk-table-populated` — added to a new gate entry `sprint.ready-for-execution` (severity: enforcing). Predicate: `body contains '| Mitigation'` (matches the markdown column header in `Sprint Plan Template.md`). Enforces that a sprint plan declares its known risks before the sprint becomes Active.

The new `sprint.ready-for-execution` gate also runs at preflight as part of the composite check (the sprint plan is itself one of the items in scope).

## 2. Blast Radius & Invalidation

- [x] **No downstream Story/Epic invalidation.** This CR adds new gates. Items already passing today's gates may newly fail `discovery-checked` if their `context_source` is null. That is the intended signal — pre-existing drafts get one cycle to backfill `context_source` before they trip preflight. v1 mode preserves backwards-compat (warn-only).
- [x] **Update Epic:** **EPIC-008** is the parent. EPIC-008's status is `Abandoned` per archive frontmatter; this CR follows the same pattern as CR-008 (reactivate a portion of EPIC-008's intent by extending its surfaces). No frontmatter mutation to EPIC-008 itself; just historical lineage.
- [ ] **Database schema impacts:** No. All state lives in markdown frontmatter (already shipped).
- [ ] **MCP impacts:** No. Push semantics unchanged. CR-010's advisory model continues; preflight runs locally before any push.
- [ ] **Audit log:** No new fields. Preflight currently exits 0/1/2 with stderr; new check #5 follows the same convention.
- [ ] **CLAUDE.md update required:** the "Sprint Execution Gate" paragraph names "the four checks." Update to "the five checks" and add one sentence naming check #5.
- [ ] **`cleargate-protocol.md` update required:** Gate 3 / Sprint Execution Gate section needs the new check listed.
- [ ] **FLASHCARD impact:** add card on completion — *"Sprint preflight composite gate runs `gate check` against all in-scope items under v2. Pre-existing drafts with null `context_source` will newly fail `discovery-checked`; backfill or downgrade to v1."*
- [ ] **Scaffold mirror discipline:** every modified file under `.cleargate/scripts/` and every modified hook/setting must be byte-equal in `cleargate-planning/`. `diff` returns empty (per the CR-014 lesson).
- [ ] **Cross-repo:** `cleargate-planning/.cleargate/knowledge/readiness-gates.md` mirror update.

## 3. Execution Sandbox

**SDR-corrections (2026-05-02):** Two additions surfaced during SPRINT-20 SDR.
1. **Skill files added to modify-list** — without them, STORY-026-02's Wave-3 CLAUDE.md prune wipes CR-027's "five checks" content. Skill is canonical post-EPIC-026.
2. **`assert_story_files.mjs` helpers verified UNEXPORTED** — line 74 (`extractWorkItemIds`) and line 90 (`findWorkItemFile`) are plain `function` declarations, NOT exports. The "if not yet exported" qualifier in the original draft is wrong-by-omission; the export step is mandatory. M5 milestone plan must pick path (a) or (b) below.

**Modify:**

- `cleargate-cli/src/commands/sprint.ts` — extend `sprintPreflightHandler` (verified at line 1075) with check #5. Insertion point: the checks array around line 1098-1103. Add helper `checkPerItemReadinessGates(sprintId, cwd, mode)` returning a `PreflightCheckResult`. Coordinates with STORY-026-01's earlier emit-line edits in the same handler (different region — STORY-026-01 edits the success-line stdout at line 1051; CR-027 inserts a new check entry into the checks array). Rebase-safe.
- `cleargate-cli/test/commands/sprint-preflight.test.ts` — add scenarios:
  1. v2 sprint with all items `cached_gate_result.pass=true` → check #5 passes.
  2. v2 sprint with one EPIC `pass=false` → check #5 fails, stderr names the item + its failing criteria.
  3. v2 sprint with one item where `last_gate_check < updated_at` → check #5 fails as stale.
  4. v1 sprint with the same #2 setup → check #5 emits warning, exit 0.
  5. Sprint with one Story status=Done in scope → that item is skipped, doesn't gate the run.
  6. Sprint plan itself fails `risk-table-populated` → check #5 names SPRINT-NN as a failing item.
- `.cleargate/knowledge/readiness-gates.md` — append `discovery-checked` to the 4 enforcing gate entries; add new `sprint.ready-for-execution` gate entry with `risk-table-populated`.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror update.
- **`.cleargate/scripts/assert_story_files.mjs`** — `extractWorkItemIds` (line 74) and `findWorkItemFile` (line 90) are NOT exported today (verified during SPRINT-20 SDR). M5 plan picks ONE of:
  - **(a) Lightweight path** — add `export` keywords; `sprint.ts` shells to the mjs script via `child_process.execFileSync` and parses JSON stdout. ~30 LOC. Lower risk; mjs stays canonical.
  - **(b) Single-source-of-truth path** — extract helpers to `cleargate-cli/src/lib/work-item-extractor.ts` (TS); refactor mjs to import via `createRequire` shim. ~80 LOC; both consumers share one implementation. Protocol §24-aligned.
  - **Recommended:** (b) — eliminates contract-drift risk per §3 risk-table row "If `assert_story_files.mjs` script's contract drifts post-CR-014, the composite check breaks silently."
- `cleargate-planning/.cleargate/scripts/assert_story_files.mjs` — byte-equal mirror.
- **`.claude/skills/sprint-execution/SKILL.md`** (live, 24KB) — update `### A.1 Sprint Execution Gate (Gate 3) — preflight` section (verified present at line ~110) from "four checks" to "five checks"; add check #5 description matching the CLAUDE.md prose. **Required by §2.5 Hard-flag resolution** — without this, Wave-3 CLAUDE.md prune wipes the content. **Wave-1-must-finish gate:** STORY-026-01 R5 creates the canonical mirror; CR-027 cannot edit canonical until that exists.
- **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md`** — byte-equal mirror update. Mirror parity per FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`. Run `npm run prebuild` in `cleargate-cli/` after the canonical edit lands.
- `cleargate-cli/src/lib/readiness-predicates.ts` — **no changes expected**. Both new predicates use existing shapes (`frontmatter(.).context_source != null` is shape #1; `body contains '| Mitigation'` is shape #2). Verify during implementation.
- `CLAUDE.md` (project) — one-sentence edit to "Sprint Execution Gate" paragraph: "The four checks" → "The five checks" + add check #5 description. **Note:** STORY-026-02's Wave-3 prune may delete this paragraph entirely; the skill update above is the surface that survives.
- `cleargate-planning/CLAUDE.md` — same edit, byte-equal where the bounded ClearGate block applies.
- `.cleargate/knowledge/cleargate-protocol.md` — update Gate 3 / Sprint Execution Gate section to list the fifth check.
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — byte-equal mirror.
- `.cleargate/FLASHCARD.md` — append flashcard line on commit (one line, dated 2026-05-02).

**Out of scope:**

- Discovery, Architecture, Evidence, and Traceability dimensions beyond what's listed here. Filed under §0.5 question 5 — wait for measurement before adding more criteria.
- A new `cleargate plan readiness <item>` standalone command. The preflight wire is the cheaper integration point; a standalone command is duplicate surface unless we have a use case beyond preflight.
- PreToolUse hook to enforce gates on raw file edits. Out of scope; preflight is the gate, not the editor.
- USD cost integration into preflight output. Out of scope.

## 4. Verification Protocol

**Acceptance:**

1. **v2 happy path.** With a sprint where every in-scope item's frontmatter shows `cached_gate_result.pass=true` and a fresh `last_gate_check`: `cleargate sprint preflight SPRINT-NN` exits 0 and stdout reads `cleargate sprint preflight: all five checks pass for SPRINT-NN`.
2. **v2 hard-block.** Mutate one in-scope Epic to `cached_gate_result.pass=false, failing_criteria=['no-tbds']`. Re-run preflight. Assert exit 1, stderr contains `❌ Per-item readiness gates: 1/N items not ready`, and the EPIC ID + failing criterion are listed.
3. **Staleness.** Edit one in-scope file's `updated_at` to a timestamp newer than its `last_gate_check`. Re-run preflight. Assert exit 1 with a "stale" reason for that item.
4. **v1 mode.** Same setup as #2 but with `execution_mode: v1` in the sprint frontmatter. Re-run preflight. Assert exit 0, stderr contains a warning about the failing item.
5. **Done items skipped.** Add a status=Done Story to scope. Re-run #1. Assert it does not appear in the failure list.
6. **`discovery-checked` fires.** Author a new Epic with `context_source: null`. Run `cleargate gate check <file>`. Assert `cached_gate_result.failing_criteria` includes `discovery-checked`. Populate `context_source: "<text>"` and re-run; assert pass.
7. **`risk-table-populated` fires.** Author a sprint plan from the template, delete the risk table. Run `cleargate gate check`. Assert `failing_criteria` includes `risk-table-populated`. Restore the table; assert pass.
8. **Protocol + CLAUDE.md alignment.** Manual review: agents reading the updated Sprint Execution Gate section see five checks; agents drafting a new Epic see `discovery-checked` in the gate criteria for that item type.
9. **Scaffold mirror.** `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` returns empty. Same for protocol + scripts.

**Test commands:**

- `cd cleargate-cli && npm run typecheck && npm test` — green.
- `cd cleargate-cli && npm test -- sprint-preflight` — focused.
- Manual smoke: run `cleargate sprint preflight` against the current SPRINT-20 in pending-sync. Capture before/after exit code + output.

**Pre-commit:**

- `npm run typecheck` clean.
- `npm test` green.
- All scaffold mirror diffs empty.
- One commit, conventional format: `feat(CR-027): off-sprint — composite planning readiness at sprint preflight + discovery/risk criteria`.
- Never `--no-verify`.

**Post-commit:**

- Move `.cleargate/delivery/pending-sync/CR-027_*.md` to `.cleargate/delivery/archive/`.
- Append flashcard line.
- Wiki re-ingest (PostToolUse hook handles automatically).

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR extends.

- **Surface:** `sprintPreflightHandler` in `cleargate-cli/src/commands/sprint.ts:1075` — the preflight function this CR extends with check #5
- **Surface:** `readSprintExecutionMode` in `cleargate-cli/src/commands/execution-mode.ts:118` — reused to gate v2-only behavior
- **Surface:** `readCachedGate` in `cleargate-cli/src/lib/frontmatter-cache.ts:27` — reused to read per-item gate results
- **Surface:** `extractWorkItemIds` in `.cleargate/scripts/assert_story_files.mjs:74` — reused to enumerate sprint work items
- **Coverage:** ≥80% — this CR extends the preflight handler with a new check; reuses 4 existing helpers; no new infrastructure

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — Ready for Sprint Execution (SPRINT-20)**

Requirements to pass to Green (Ready for Execution):

- [x] "Obsolete Logic" to be evicted is explicitly declared (4-check preflight model; absence of `discovery-checked`/`risk-table-populated`).
- [x] All impacted downstream items identified (no Story/Epic invalidation; pre-existing drafts may newly fail `discovery-checked` — intended signal).
- [x] Execution Sandbox contains exact file paths with the existing CR-014/CR-021 helpers cited.
- [x] Verification command provided with 9 acceptance scenarios.
- [x] §0.5 Q1 resolved 2026-05-02 — single CR, in-sprint (SPRINT-20).
- [x] §0.5 Q2 resolved 2026-05-02 — mirror CR-014 (v2 hard-block, v1 warn-only).
- [x] §0.5 Q3 resolved 2026-05-02 — cheap predicate (`frontmatter(.).context_source != null`).
- [x] §0.5 Q4 resolved 2026-05-02 — sprint plan only.
- [x] §0.5 Q5 resolved 2026-05-02 — wait, measure first.
- [x] `approved: true` is set in the YAML frontmatter.
