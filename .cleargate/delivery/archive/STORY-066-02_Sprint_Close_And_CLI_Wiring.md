---
story_id: STORY-066-02
parent_epic_ref: CR-066
parent_cleargate_id: CR-066
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,scripts,sprint-close
status: Completed
approved: false
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
context_source: |
  Second half of CR-066 split at SPRINT-28 SDR 2026-05-17. STORY-066-01
  ships the pure-function library (`parent-rollup.ts`). This story wires
  it into:
    a) close_sprint.mjs Step 2.6c (block-mode on halts, atomic frontmatter
       write on auto-flips), plus mirror under cleargate-planning/.
    b) `cleargate sprint reconcile-lifecycle --parents` flag (read-only audit
       outside of close) on reconcileLifecycleHandler in commands/sprint.ts.

  Depends on STORY-066-01 landing first (re-export of `walkActiveParents`
  from lifecycle-reconcile.ts is the import surface used here).

  Mirror parity: close_sprint.mjs lives in two places per FLASHCARD
  2026-05-04 `#mirror #parity`. Both must update in the same commit.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:18:49Z
stamp_error: no ledger rows for work_item_id STORY-066-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:18:49Z
  sessions: []
---

# STORY-066-02: Sprint-Close Step 2.6c + `--parents` CLI Flag

**Complexity:** L2 — script edit (`close_sprint.mjs` + canonical mirror), CLI handler edit (`commands/sprint.ts`), one new e2e test fixture.

## 1. The Spec

### 1.1 User Story

As `cleargate sprint close` (and as an operator running `cleargate sprint reconcile-lifecycle --parents --dry-run` ad-hoc), I want sprint close to roll up parent (Epic/Sprint) statuses against archived children — auto-flipping on 100% coverage and halting on partial/zero-children — so that stale parent frontmatter cannot accumulate.

### 1.2 Detailed Requirements

1. **`close_sprint.mjs` Step 2.6c** — insert after Step 2.6b (line ~407, end of `Step 2.6b` block). New step:
   - Calls `walkActiveParents({ deliveryRoot, archiveRoot: path.join(deliveryRoot, 'archive') })` from `cleargate-cli/dist/lib/lifecycle-reconcile.js` (re-exported via STORY-066-01).
   - Collect verdicts. For each `auto-flip`: rewrite parent's `status:` via the atomic frontmatter write pattern used by `cleargate push` (`writeAtomic` via `tmpfile + fs.renameSync`). Emit one log line per applied flip: `Step 2.6c: EPIC-016 status Draft → Completed (6/6 children Completed: STORY-016-01..06)`.
   - For each `halt-partial` / `halt-zero-children`: collect into `haltList`. After processing all parents, if `haltList.length > 0` → `process.exit(1)` with summary block: `Step 2.6c HALT: N parent(s) require manual ack: ...` followed by one bullet per halt with `halt_reason`. **No `--no-strict` opt-out flag in v1.**
   - For each `no-op` / `skip-deferred`: silent.
   - Mirror the same change in `cleargate-planning/.cleargate/scripts/close_sprint.mjs`.
2. **`reconcileLifecycleHandler` `--parents` flag** in `cleargate-cli/src/commands/sprint.ts`:
   - Add `--parents` boolean option to the existing `reconcile-lifecycle` subcommand.
   - When set, ALSO call `walkActiveParents` and print the result table (no mutation; this is a read-only audit). Output format:
     ```
     Parent rollup audit (--parents):
       EPIC-016  ✓ proposed: Completed (6/6 children Completed)
       EPIC-010  ✗ halt-partial: 7/8 children terminal — pending: STORY-010-02
       EPIC-021  ✗ halt-zero-children: 0 children drafted; not reconcilable
       EPIC-023  ✗ sub-epic-partial: SUB-EPIC-2 not Completed
     ```
   - Always read-only outside of close. `--apply` flag is OUT OF SCOPE for this story — close_sprint.mjs is the only writer in v1. (STORY-028-01 still uses `--parents --apply` as a *future* signature; the actual write path STORY-028-01 hits is `cleargate sprint close` dry-running parent rollup via this same audit. Story 028-01 reconciles by running close pre-flight, not via a standalone apply flag. Update STORY-028-01 wording at orchestrator level if needed.)
3. **Mirror parity check** — after editing both `close_sprint.mjs` copies, run `diff .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs` → must return empty.

### 1.3 Out of Scope

- Library logic (STORY-066-01).
- An `--apply` standalone flag on `reconcile-lifecycle --parents` (deferred; orchestrator runs the harvest by invoking `close_sprint.mjs` against a sentinel sprint, OR a follow-up CR adds `--apply` if SPRINT-29 prep needs it).
- Tightening `ARTIFACT_TERMINAL_STATUSES` to `['Completed']` only (STORY-067-03).

### 1.4 Open Questions

- **Question:** STORY-028-01's spec text reads `cleargate sprint reconcile-lifecycle SPRINT-27 --parents --apply` — but this story explicitly defers the `--apply` write side outside of close. How does STORY-028-01 actually commit the auto-flips?
- **Recommended:** STORY-028-01 invokes `cleargate sprint close SPRINT-28` early, which runs Step 2.6c against the current repo. Auto-flips commit there. Alternative: add a one-liner script `node .cleargate/scripts/run_parent_rollup.mjs --apply` that delegates to STORY-066-01's library + writes atomically; cheap.
- **Human decision:** Orchestrator decides at Wave 3 dispatch which path STORY-028-01 uses.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| `dist/lib/lifecycle-reconcile.js` is out-of-date when close_sprint.mjs imports `walkActiveParents` | Pre-gate runner already runs `npm run build` for cleargate-cli/; verify the build output contains the new export before close. Add a defensive `typeof walkActiveParents === 'function'` guard with a "rebuild cleargate-cli/" error message. |
| Atomic frontmatter write breaks roundtrip per FLASHCARD 2026-04-24 `#frontmatter #write-back` | Use the **read raw bytes + regex-replace `status:` line** pattern (not parseFrontmatter+re-serialize). Mirror the pattern in `frontmatter-yaml.ts`'s atomic-line-edit helper if it exists; else inline. |
| Mirror drift between live + canonical close_sprint.mjs | Add a Wave-2 QA check: `diff` returns empty. |

### 1.6 Existing Surfaces

- **Surface:** `.cleargate/scripts/close_sprint.mjs:294-407` — existing Step 2.6 + 2.6b structure; new step inserts after line 407.
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — canonical mirror; same line range.
- **Surface:** `cleargate-cli/src/commands/sprint.ts` `reconcileLifecycleHandler` — existing CLI option parsing; add `--parents` to the option spec.
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — atomic-line-edit helpers; check whether a `setFrontmatterField(file, key, value)` helper exists. If yes, reuse; if no, inline the regex-replace.
- **Coverage of this story's scope:** ~70% — extends existing script + CLI handler; new code is the Step 2.6c block (~40 LOC) + `--parents` option wiring (~15 LOC).

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** inline the parent-rollup traversal directly in `close_sprint.mjs` without a separate library import.
- **Why isn't extension sufficient?** STORY-066-01 already extracted the library — re-implementing inline would duplicate the algorithm. Library import keeps Step 2.6c a thin shell (~40 LOC) that delegates traversal to tested code.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Sprint-close Step 2.6c + --parents CLI flag

  Scenario: Step 2.6c auto-flips a fully-covered parent at close
    Given a fixture sprint and a parent EPIC-FXTRA with 3/3 children Completed in archive
    When close_sprint.mjs runs through Step 2.6c
    Then EPIC-FXTRA frontmatter is rewritten in-place with status: Completed
    And stdout contains "Step 2.6c: EPIC-FXTRA status Draft → Completed (3/3 children Completed"
    And close proceeds past Step 2.6c

  Scenario: Step 2.6c halts on partial coverage
    Given a fixture parent EPIC-FXTRB with 2/3 children Completed and 1 still Approved
    When close_sprint.mjs runs through Step 2.6c
    Then process exits with code 1
    And stdout contains "Step 2.6c HALT" and the partial-coverage list naming EPIC-FXTRB
    And no frontmatter mutations were committed

  Scenario: Step 2.6c halts on zero-children
    Given a fixture parent EPIC-FXTRC with no children in archive or pending-sync
    When close_sprint.mjs runs through Step 2.6c
    Then process exits with code 1
    And stdout contains "halt-zero-children" and EPIC-FXTRC

  Scenario: --parents CLI flag prints read-only audit
    Given the same fixture state as the prior scenarios combined
    When `cleargate sprint reconcile-lifecycle SPRINT-FIX --parents` runs
    Then stdout contains "Parent rollup audit (--parents):"
    And the table lists all three EPIC-FXTR* parents with verdicts
    And exit code is 0 (audit is informational; does not block)
    And no frontmatter mutations occurred

  Scenario: Mirror parity check passes after the edit
    Given the live close_sprint.mjs was edited
    When `diff .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs` runs
    Then exit code is 0 (empty diff)
```

### 2.2 Verification Steps (Manual)

- [ ] On the live repo, run `cleargate sprint reconcile-lifecycle SPRINT-27 --parents` post-merge — output enumerates the 6 stale Epics with verdicts matching CR-066 §1 audit table.
- [ ] Diff the two close_sprint.mjs copies returns empty.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `.cleargate/scripts/close_sprint.mjs` |
| Mirror File | `cleargate-planning/.cleargate/scripts/close_sprint.mjs` |
| CLI Handler | `cleargate-cli/src/commands/sprint.ts` |
| Library Import | `cleargate-cli/dist/lib/lifecycle-reconcile.js` (built from STORY-066-01) |
| Test File | `cleargate-cli/test/scripts/close-sprint-step-2-6c.node.test.ts` (NEW) |
| Fixture | `cleargate-cli/test/fixtures/close-step-2-6c/` (NEW) — minimal fake sprint + 3 parent epics in 3 verdict shapes |
| New Files Needed | Yes — one test + one fixture tree |

### 3.2 Technical Logic

1. **Step 2.6c insertion** (in both close_sprint.mjs copies):
   ```js
   // ── Step 2.6c: Parent (Epic/Sprint) Rollup (CR-066) ──────────────────
   process.stdout.write('Step 2.6c: rolling up parent statuses...\n');
   try {
     const reconcilerMod = await import(path.join(repoRoot, 'cleargate-cli/dist/lib/lifecycle-reconcile.js'));
     if (typeof reconcilerMod.walkActiveParents !== 'function') {
       process.stdout.write('Step 2.6c skipped: walkActiveParents not in built CLI — rebuild cleargate-cli/.\n');
     } else {
       const results = reconcilerMod.walkActiveParents({ deliveryRoot, archiveRoot });
       const flips = results.filter(r => r.verdict === 'auto-flip');
       const halts = results.filter(r => r.verdict === 'halt-partial' || r.verdict === 'halt-zero-children');
       for (const f of flips) {
         setFrontmatterStatusAtomic(f.parent_path, 'Completed');
         process.stdout.write(`Step 2.6c: ${f.parent_id} status ${f.current_status} → Completed (${f.terminal_children.length}/${f.terminal_children.length} children Completed: ${f.terminal_children.join(', ')})\n`);
       }
       if (halts.length > 0) {
         process.stderr.write(`Step 2.6c HALT: ${halts.length} parent(s) require manual ack:\n`);
         for (const h of halts) process.stderr.write(`  - ${h.halt_reason}\n`);
         process.exit(1);
       }
       process.stdout.write(`Step 2.6c passed: ${flips.length} parent(s) auto-flipped; no halts.\n`);
     }
   } catch (e26c) {
     process.stderr.write(`Step 2.6c warning: parent rollup unavailable: ${e26c.message}\n`);
   }
   ```
2. **`setFrontmatterStatusAtomic`** helper — inlined in close_sprint.mjs (or imported from `frontmatter-yaml.ts` if a compatible helper exists). Use the **raw-bytes regex-replace** pattern from FLASHCARD 2026-04-24 to avoid parse-frontmatter byte loss:
   ```js
   function setFrontmatterStatusAtomic(filePath, newStatus) {
     const raw = fs.readFileSync(filePath, 'utf8');
     const fm = raw.match(/^---\n([\s\S]*?)\n---/);
     if (!fm) throw new Error(`No frontmatter in ${filePath}`);
     const newFm = fm[1].replace(/^status:.*$/m, `status: ${newStatus}`);
     const newRaw = raw.replace(fm[1], newFm);
     const tmp = filePath + '.tmp.' + process.pid;
     fs.writeFileSync(tmp, newRaw);
     fs.renameSync(tmp, filePath);
   }
   ```
3. **`--parents` flag wiring** in `commands/sprint.ts`:
   - Add option to `reconcile-lifecycle` subcommand: `.option('--parents', 'audit parent (Epic/Sprint) rollup statuses; read-only')`.
   - In the handler, after existing reconciler logic, if `opts.parents` is set, call `walkActiveParents` and print the table per §1.2 example.
   - No mutation; exit 0 even if halts exist (audit-only mode).

### 3.3 API Contract

CLI: `cleargate sprint reconcile-lifecycle <sprint-id> [--parents]` — new flag, read-only.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| e2e — Step 2.6c | 3 | auto-flip / halt-partial / halt-zero-children |
| Mirror parity | 1 | diff live vs canonical returns empty |
| CLI flag — read-only audit | 1 | stdout table matches expected format |

### 4.2 Definition of Done

- [ ] Step 2.6c block inserted in both `close_sprint.mjs` copies; diff empty.
- [ ] `reconcileLifecycleHandler` accepts `--parents`; read-only audit prints expected table.
- [ ] e2e tests cover 3 verdict shapes against fixture sprint.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.
- [ ] Defensive `typeof walkActiveParents === 'function'` guard in close_sprint.mjs (graceful degrade if dist/ stale).

## Existing Surfaces

- **Surface:** `.cleargate/scripts/close_sprint.mjs` — existing Step 2.6 + 2.6b structure (lines 294-407); new step inserts after line 407.
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — canonical mirror; same line range.
- **Surface:** `cleargate-cli/src/commands/sprint.ts` — existing `reconcileLifecycleHandler` CLI option parsing; add `--parents` to the option spec.
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — atomic-line-edit helpers; check whether a `setFrontmatterField(file, key, value)` helper exists. If yes, reuse; if no, inline the regex-replace.
- **Coverage of this story's scope:** ~70% — extends existing script + CLI handler; new code is the Step 2.6c block (~40 LOC) + `--parents` option wiring (~15 LOC).

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — one Open Question on STORY-028-01 wiring; resolution deferred to orchestrator at Wave 3 dispatch.
