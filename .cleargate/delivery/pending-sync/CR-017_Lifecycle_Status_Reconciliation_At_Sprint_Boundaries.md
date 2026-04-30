---
cr_id: CR-017
parent_ref: STORY-022-07
status: Approved
approved: true
approved_at: 2026-04-28T00:00:00Z
approved_by: sandrinio
sprint: SPRINT-15
milestone: M4
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:05Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Conversation 2026-04-28 — SPRINT-15 pre-kickoff audit caught CR-001 had
  shipped 9 days earlier in commit 54e0a1a but stayed status: Draft in
  pending-sync. Same audit detected the SPRINT-14 cohort (~17 items) also
  unarchived after shipping. Root cause: nothing in the pipeline reconciles
  git log against artifact lifecycle. User asked at which gates/actions we
  should enforce status updates. Layers 1 + 2 picked from the four-layer
  recommendation; layers 3 (per-commit hook) and 4 (wiki contradict rule)
  deferred — layer 3 too noisy on bundled commits, layer 4 is free with
  EPIC-020 and can land separately.

  Conversation 2026-04-29 — extended scope. User flagged that "PROPOSAL-013
  decomp" appearing as a SPRINT-15 deliverable conflated planning artifacts
  with executable work. Established rule: a proposal/epic must be decomposed
  (Epic + Gherkin'd stories) BEFORE the sprint executing it activates.
  Decomposition is between-sprints transition work, not story-tracked.
  CR-017 extended to enforce this — the same sprint-init gate now validates
  decomposition completeness alongside lifecycle reconciliation. Protocol
  gains §26 "Decomposition Gate" alongside §25 "Lifecycle Reconciliation".
stamp_error: no ledger rows for work_item_id CR-017
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T06:08:08Z
  sessions: []
---

# CR-017: Lifecycle Status Reconciliation + Decomposition Gate at Sprint Boundaries

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Status updates rely on developer/orchestrator memory.** Today, when a Developer agent commits `feat(STORY-NNN-NN): ...`, no system action requires the artifact's `status:` field to advance or the file to move to `archive/`. Drift accumulates silently — CR-001 stayed `Draft` 9 days post-ship; the entire SPRINT-14 cohort (~17 items) was unarchived 2 days post-ship.
- **Sprint close validates Reporter sections only.** STORY-022-07's `close_sprint.mjs` validator checks that REPORT.md has the right structure; it does not verify that artifacts referenced by the sprint's commits have actually transitioned out of pending-sync.
- **Sprint init has no pre-activation check.** `cleargate sprint init` activates a new sprint without auditing whether the previous sprint's artifacts are reconciled. Stale items leak forward and pollute new-sprint planning (the 2026-04-28 SPRINT-15 audit caught 17+ items this way).
- **Proposals/epics treated as sprint deliverables.** Sprint plans have historically listed "decompose PROPOSAL-X into EPIC-Y" as a milestone deliverable, conflating planning artifacts with executable work. Result: the receiving sprint depends on planning that hasn't happened, and the producing sprint takes credit for output it can't actually verify (no Gherkin, no QA, no shippable behavior). The 2026-04-28 SPRINT-15 draft included PROPOSAL-013 → EPIC-023 decomp as M5; flagged 2026-04-29.

**New Logic (The New Truth):**

- **Two shared scanners** in `cleargate-cli/src/lib/lifecycle-reconcile.ts`:
  - `reconcileLifecycle(opts)` — git-log range → `(<TYPE>-NNN, expected_terminal_status)` tuples; drift = any referenced artifact whose live `status:` is non-terminal.
  - `reconcileDecomposition(opts)` — sprint plan's `epics:` + `proposals:` arrays → required-files set; drift = any referenced epic that lacks ≥1 child story file with matching `parent_epic_ref:`, OR any proposal that's `Approved` but has no decomposed epic in pending-sync.
- **Three invocation contexts:**
  1. **Sprint close** — `close_sprint.mjs` runs `reconcileLifecycle` over the sprint window (`start_date..end_date`) and **blocks close** on any drift, printing a per-artifact punch list with the offending commit SHA and required action.
  2. **Sprint kickoff — lifecycle layer** — `cleargate sprint init` runs `reconcileLifecycle` over the gap between the previous sprint's `end_date` and `now()` and **blocks activation** until either (a) status flipped + archived, or (b) `carry_over: true` set in frontmatter, or (c) `--allow-drift` flag passed (recorded in sprint context_source as a waiver).
  3. **Sprint kickoff — decomposition gate** — `cleargate sprint init` ALSO runs `reconcileDecomposition` against the activating sprint's plan. **Blocks activation** if any anchor epic lacks decomposed stories OR any anchor proposal lacks a decomposed epic. No `--allow-drift` waiver applies — decomposition is non-negotiable; the only exit is to do the decomposition.
- **Commit-verb → terminal-status mapping** is fixed in v1:
  - `feat(<TYPE>-NNN): ...` → expects `status ∈ {Completed, Done}` AND file in `archive/`.
  - `fix(BUG-NNN): ...` → expects `status: Verified` AND file in `archive/`.
  - `merge: <TYPE>-NNN → ...` → counts as a contributing commit; merged-into commit is the authoritative one.
  - `chore(SPRINT-NN): ...` / `file()` / `plan()` → no expectation (these are bookkeeping/drafting verbs, not ship verbs).
  - Multi-ID commits (e.g., `fix(cli)!: BUG-001 ... + CR-001 ...`) — every ID parsed; each must have its own terminal status. The CR-001 case is the canonical motivating example.
- **Carry-over is a first-class concept.** A pending-sync artifact with `carry_over: true` in frontmatter passes the lifecycle validator silently. Carry-over is set explicitly by the human at sprint close (not auto-inferred) — a deliberate "we're keeping this open across the boundary" signal.
- **Decomposition is between-sprints transition work, not a sprint deliverable.** Architect drafts `EPIC-NNN_*.md` + `STORY-NNN-NN_*.md` files in the window between sprint N close and sprint N+1 activation. Output is gate-clean files in pending-sync (status `Approved`, `cached_gate_result.pass: true`). Not story-tracked, no Gherkin on the decomposition itself, no QA — but the `reconcileDecomposition` validator at sprint init verifies the output. If decomposition isn't ready by the activating sprint's `start_date`, that sprint cannot activate; pushing `start_date` is the answer, not relaxing the gate.
- **v1 mode policy by gate:**
  - **Sprint close lifecycle:** block-by-default. Keeps pressure on the producing sprint.
  - **Sprint init lifecycle:** warn-only at v1 (block at v2 = post-SPRINT-15 close). Rationale: SPRINT-15 itself would trip kickoff-block today (CR-001 only just got reconciled, plus the SPRINT-14 cohort awaits M0 sweep). Warn-only at kickoff lets the M0 hygiene run without first-failing the gate. SPRINT-16 init flips this to block after one clean SPRINT-15 close.
  - **Sprint init decomposition:** block-by-default from v1. No grace period — decomposition is binary (either the files exist or they don't); soft enforcement teaches the wrong lesson. The first sprint to use it (SPRINT-16) must have its decomposition complete before activation; if Architect can't deliver in the transition window, push `start_date`.

## 2. Blast Radius & Invalidation

- [x] **Reset gate on STORY-022-07** (Reporter Sprint Report v2.1 + `close_sprint.mjs` validation, shipped). CR-017 extends `close_sprint.mjs` with a new validation phase. No code rollback needed (additive); STORY-022-07's existing checks continue to run.
- [x] **Reset gate on EPIC-022** (Sprint Lane Classifier + Hotfix Path, shipped). CR-017's sprint-kickoff hook lives in the same `cleargate sprint init` surface that EPIC-022's lane-classifier work modified. Surface coexistence verified — lane-classifier writes `state.json` v2; lifecycle-reconciler reads git log + frontmatter. Disjoint concerns.
- [x] **Database schema impacts?** No. Both validators are CLI-side; no MCP table touched.
- [x] **Protocol amendments.** `.cleargate/knowledge/cleargate-protocol.md` gains:
  - **§25 Lifecycle Reconciliation** — verb-to-status mapping, carry-over flag, block-vs-warn semantics per phase.
  - **§26 Decomposition Gate** — proposals must be decomposed (Epic file in pending-sync citing the proposal) before any sprint activates against them; epics must have ≥1 child story file (with `parent_epic_ref:` matching) before the executing sprint activates. Decomposition is between-sprints transition work; not story-tracked. Verified at `cleargate sprint init` via `reconcileDecomposition`.
- [x] **Templates touch.** `epic.md`, `story.md`, `CR.md`, `Bug.md`, `hotfix.md` gain the optional top-level frontmatter key `carry_over: false` (default false). Sprint Plan Template gets `--allow-drift waiver` field guidance in §1 instructions. (STORY-015-05 also touches templates this sprint — coordinate via §3.2 merge ordering with that story.)
- [x] **No version bump on its own.** CR-017 ships within whatever 0.9.x cycle CR-016 anchors. If CR-016 ships first this sprint, CR-017 lands as 0.9.1; if CR-017 ships first, 0.9.0 carries both.

## 3. Execution Sandbox

**Modify:**

- `.cleargate/scripts/close_sprint.mjs` — add Phase: `reconcileLifecycle` call after Reporter-section validation; block on drift; print punch list with offending commit SHA + suggested remediation (e.g., `git mv pending-sync/CR-001_*.md archive/ && update status: Completed`).
- `cleargate-cli/src/commands/sprint.ts` (or wherever `cleargate sprint init` is wired — verify path during dev) — add TWO calls at the top of init flow before any state.json mutation: (a) `reconcileLifecycle()` warn-only in v1; honors `--allow-drift`; (b) `reconcileDecomposition()` block-by-default in v1; no waiver flag (the only exit is doing the decomposition).
- `.cleargate/knowledge/cleargate-protocol.md` — append:
  - **§25 Lifecycle Reconciliation** with the verb→status table, carry-over semantics, and v1-vs-v2 block-mode policy.
  - **§26 Decomposition Gate** describing the rule (proposals → Epic files; epics → story files), the between-sprints transition concept, and the gate's invocation at `cleargate sprint init`.
- `.cleargate/templates/{epic,story,CR,Bug,hotfix}.md` — add `carry_over: false` (default) as a top-level frontmatter key. Coordinate merge with STORY-015-05's templates touch — this CR's edit lands AFTER 015-05's so the file already has the new YAML structure to extend.

**Create:**

- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — shared scanner module exporting two functions:
  - `reconcileLifecycle(opts: { since: Date; until?: Date; deliveryRoot: string }): { drift: DriftItem[]; clean: number }`. `DriftItem = { id, type, expected_status, actual_status, file_path, in_archive, commit_shas[] }`.
  - `reconcileDecomposition(opts: { sprintPlanPath: string; deliveryRoot: string }): { missing: MissingDecomp[]; clean: number }`. `MissingDecomp = { id, type: 'epic' | 'proposal', reason: 'no-child-stories' | 'no-decomposed-epic' | 'file-missing', expected_files: string[] }`.
- `cleargate-cli/test/lib/lifecycle-reconcile.test.ts` — table-driven scenarios (see §4).
- `cleargate-cli/test/lib/decomposition-gate.test.ts` — table-driven scenarios for `reconcileDecomposition`.
- `cleargate-cli/test/scripts/close-sprint-reconcile.test.ts` — sprint-close integration test against a fixture sprint with seeded drift.
- `cleargate-cli/test/commands/sprint-init-decomp-gate.test.ts` — sprint-init integration test against a fixture sprint with missing decomposition.

**Out of scope:**

- Per-commit pre-/post-commit hook enforcement (Layer 3 of the four-layer recommendation; deferred — too noisy on legitimate bundled commits).
- Wiki contradict-rule "code vs. status mismatch" (Layer 4; folds into EPIC-020 STORY-020-02 advisory log as a separate add — file separately if needed).
- Auto-inferring `carry_over` from sprint-plan continuity. Carry-over is a deliberate human signal; auto-inferring would re-introduce the silent-drift class this CR exists to prevent.
- Re-archiving past unarchived items. CR-017 protects future sprints; the SPRINT-14 cohort + CR-001 sweep happens via M0 hygiene this sprint, not via CR-017's mechanisms.

## 4. Verification Protocol

**Failing tests (prove the gap):**

```bash
# Scenario: a fixture sprint where CR-001-style drift exists
# Pre-fix: close_sprint.mjs exits 0 despite Draft artifact referenced in feat() commit
# Post-fix: exits 1 with "DRIFT: CR-001 status=Draft in pending-sync, expected Completed in archive (commit 54e0a1a)"
node .cleargate/scripts/close_sprint.mjs --sprint SPRINT-FIXTURE
echo $?  # expected 1
```

**Acceptance scenarios (Gherkin shape):**

1. **Clean sprint close passes** — no commits reference unreconciled artifacts → `close_sprint.mjs` exits 0, prints "lifecycle: clean (N artifacts reconciled)".
2. **Drift at close blocks** — one `feat(STORY-NNN-NN)` commit's artifact is still `status: Draft` in pending-sync → exits 1, punch list names the artifact, the commit SHA, and the remediation command.
3. **Multi-ID commit fully validated** — single commit with `BUG-001 + CR-001` references; both must reconcile; one stale → exits 1 naming the stale one only.
4. **Carry-over silenced** — artifact with `carry_over: true` referenced in `feat()` commit → no drift reported; close exits 0.
5. **Sprint-init warn-only (v1)** — drift detected at kickoff → stderr warning + punch list printed; init proceeds; activation succeeds. State.json records the drift list under a new `lifecycle_drift_at_init` field.
6. **Sprint-init `--allow-drift` waiver** — explicit flag passed → drift list still printed, init proceeds, sprint frontmatter context_source appends "lifecycle waiver: <date> for <ids>" automatically.
7. **Verb mismatch detected** — `feat(BUG-NNN)` (wrong verb for a bug-fix) → soft warning ("verb 'feat' unusual for BUG; expected 'fix'") but does not block in v1.
8. **Unknown ID gracefully ignored** — commit references `STORY-999-99` that has no file in delivery/ → logged once at info level, not counted as drift (defensive: stale commit messages).

**Decomposition-gate scenarios (sprint init, block-by-default v1):**

9. **Clean decomposition passes** — sprint plan's `epics: ["EPIC-X"]` references EPIC-X file in pending-sync; EPIC-X has ≥1 child story file with `parent_epic_ref: EPIC-X` → `reconcileDecomposition` returns `{ missing: [], clean: N }`; init proceeds.
10. **Anchor epic without stories blocks** — sprint plan references EPIC-Y; EPIC-Y file exists but no story file has `parent_epic_ref: EPIC-Y` → `reconcileDecomposition` returns missing entry with `reason: 'no-child-stories'`; init exits 1; punch list names EPIC-Y and the action ("draft ≥1 STORY-Y-NN_*.md with parent_epic_ref: EPIC-Y").
11. **Anchor proposal without epic blocks** — sprint plan's `proposals: ["PROPOSAL-Z"]` references an Approved proposal; no epic file in pending-sync cites PROPOSAL-Z in `context_source:` → missing entry with `reason: 'no-decomposed-epic'`; init exits 1.
12. **Anchor file missing entirely blocks** — sprint references EPIC-W but no `EPIC-W_*.md` exists → missing entry with `reason: 'file-missing'`; init exits 1.
13. **No `--allow-drift` waiver for decomposition** — flag passed but `reconcileDecomposition` reports missing → init still exits 1; flag only suppresses lifecycle drift, not decomposition. Stderr message: "decomposition gate cannot be waived; complete the decomposition or push start_date."

**Command/Test:**

```bash
cd cleargate-cli && npm run typecheck && npm test -- lifecycle-reconcile close-sprint-reconcile decomposition-gate sprint-init-decomp-gate
```

**Manual rollout test (post-merge, before sprint close):**

```bash
# Run against the live SPRINT-15 close to validate it would have caught CR-001
node .cleargate/scripts/close_sprint.mjs --sprint SPRINT-15 --dry-run
# Expected: clean (CR-001 already archived in M0)
# Then re-run with a synthetic Draft artifact in pending-sync referenced by a recent commit
# Expected: blocks with punch list
```

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

- [x] "Obsolete Logic" to be evicted is explicitly declared (memory-based status discipline).
- [x] All impacted downstream items identified (STORY-022-07, EPIC-022, templates touched by STORY-015-05).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command + acceptance scenarios provided.
- [x] `approved: true` is set in the YAML frontmatter.
