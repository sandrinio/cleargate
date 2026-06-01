---
sprint_id: SPRINT-33
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-33"
carry_over: false
lifecycle_init_mode: warn
execution_mode: v2
remote_id: ""
source_tool: linear
context_source: Decomposes EPIC-043 (Framework Hygiene & Efficiency Remediation, pushed v2) + Approved CR-070, from the 2026-06-01 source-level framework self-review. Owner directed 'take them all' (full EPIC-043 scope) on 2026-06-01.
status: Completed
start_date: 2026-06-02
end_date: 2026-06-13
synced_at: ""
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
area: framework/hygiene
epics:
  - EPIC-043
crs:
  - CR-070
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:30Z
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-4-8
  last_stamp: 2026-05-31T22:09:18Z
  sessions:
    - session: 4420c861-8a6f-40a6-93ac-1829eb771e0b
      model: claude-opus-4-8
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-31T22:07:27Z
---

# SPRINT-33: Framework Hygiene & Gate Correctness

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pushed via `cleargate push`. Pair with §3 Risks below.)*

- **Sprint Goal:** Make every ClearGate gate fire correctly on the right signal, retire stale/duplicated scaffold debt, and add a sprint-end consolidation pass — strengthening delivery quality while cutting weak signals and token cost, without touching the adversarial core.
- **Business Outcome:** The framework stops blocking well-formed work for template bugs, stops loading ~45k of stale context per session, and gains a cross-story quality pass — so agents are more reliable, more token-efficient, and ship cleaner code.
- **Risks (top 3):** (1) CR-070 must land before the flashcard-sentinel fix; (2) `SKILL.md`/`qa.md` are touched by multiple stories — merge order matters; (3) every scaffold edit must mirror canonical→payload→live or it ships buggy (BUG-024 class).
- **Metrics:** 0 items blocked by template false-negatives; flashcard gate enforces again; ~45k session tax trends down; standard-lane stories drop 6→5 dispatches; per-edit wiki recompiles −≥75%.

## Sprint Goal
Repair the gates that don't gate, reconcile templates↔predicates, cut the session/loop token taxes, and add the `/simplify` consolidation pass — executing EPIC-043 (all 8 workstreams) plus the Approved CR-070.

## 1. Consolidated Deliverables

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `CR-070` | Collapse execution_mode to single always-enforced behavior | standard | M1 | n | med |
| `STORY-043-01` | Flashcard sentinel → fail-closed (after CR-070) | standard | M1 | n | med |
| `STORY-043-02` | Readiness predicate heading-TEXT anchoring | standard | M1 | y | med |
| `STORY-043-03` | Template gate-correctness (de-number + context_source + repro + proposal purge) | standard | M1 | n | high |
| `STORY-043-04` | Register `hotfix` WorkItemType + gate block | standard | M1 | y | low |
| `STORY-043-05` | Sprint-close hardening + reporter v2 + flashcard curation | standard | M1 | n | high |
| `STORY-043-06` | README/QUICKSTART + init banner + qa.md doc-truth | standard | M2 | y | low |
| `STORY-043-07` | Incremental wiki synthesis recompile | standard | M3 | y | med |
| `STORY-043-08` | Conditional Architect re-entries (fire on pre-gate signal) | standard | M3 | n | high |
| `STORY-043-09` | CLI surface hygiene (hide plumbing + stub label + orphan delete) | standard | M3 | y | low |
| `STORY-043-10` | Sprint consolidation `/simplify` pass | standard | M4 | n | med |

## 2. Execution Strategy (SDR-validated)

> SDR note: every cited surface in §§2.1–2.5 was Read/grep-verified against the working tree on 2026-06-01. The single material amendment is CR-070's status (already merged — see §2.2 + VERDICT). VERDICT: APPROVE-WITH-AMENDMENTS.

### 2.1 Phase Plan

**M1 — Gate correctness.**
- `CR-070` — **already merged in-tree** as STORY-070-01 (commit `b87f6ac0`, EPIC-029 banner). `state.schema.json` is v3, `gate-mode.ts` (`isAdvisory()`) is tracked, `cleargate-enforcement.md` §15 Operator Emergency Levers exists, `init_sprint.mjs`/`close_sprint.mjs` are unconditional, `check:no-execution-mode-vocabulary` is wired in `package.json`. **The only CR-070 deliverable still missing is `cleargate-cli/test/util/gate-mode.test.ts` (named in CR-070 §3 line 164, never created).** Action: run CR-070 as a thin closure story that (a) adds the missing `gate-mode.test.ts`, (b) confirms the in-tree state via its Test 1/2/5 grep gates, then archive the CR. It carries no risk for `STORY-043-01` because the dependency ("execution_mode is gone") is **already satisfied**.
- `STORY-043-01` (sentinel fail-closed) — sequence after CR-070 closure for ledger cleanliness, but its blocking precondition already holds: `init_sprint.mjs` no longer writes `execution_mode`. The live `pending-task-sentinel.sh` (lines 54-58, 135-136) is the one consumer that still reads the now-absent field — exactly the inert read this story removes. Sequential within M1. Parallel-safe against -02/-03/-04 (disjoint files).
- `STORY-043-02` (predicate heading-text anchoring) ‖ — independent file (`readiness-predicates.ts`). Confirmed anchors: `evalBodyContains` L345, `evalExistingSurfacesVerified` L708, `startsWith('## Existing Surfaces')` L720.
- `STORY-043-04` (hotfix type) ‖ — independent files (`work-item-type.ts` has zero `hotfix` today; `readiness-gates.md` has zero hotfix block today — both verified). Parallel-safe.
- `STORY-043-03` (template de-number) — **after `STORY-043-02`**. With -02's heading-text anchoring landed, -03's de-numbering becomes cosmetic-but-still-correct; both fix the same root bug from opposite sides and do not conflict. Sequential after -02.
- `STORY-043-05` (close hardening + reporter v2 + flashcard curation) — independent within M1 (`close_sprint.mjs`, `reporter.md`, flashcard `SKILL.md`). Verified genuinely undone: `reporter.md` still says "six sections / template_version: 1"; flashcard-archive prose absent. **Does NOT touch `execution_mode` lines** — its `close_sprint.mjs` hunks (dist-assertion before Step 2.6, `--assume-ack` cascade de-dup at L168/L763) are disjoint from CR-070's already-merged `execution_mode` migrator (L206) and "always-enforced" comments. Runs anytime in M1.

**M2 — Docs.** `STORY-043-06` (README + init banner + qa.md prose) — standalone. Touches `qa.md` (shared with -10, disjoint hunk — see §2.2).

**M3 — Efficiency.** `STORY-043-07` (incremental wiki recompile) ‖ `STORY-043-09` (CLI surface hygiene). Disjoint files: -07 in `wiki-ingest.ts`; -09 in `cli.ts` + `triage-classifier.ts` (delete) + `write_dispatch.sh`. `STORY-043-08` (conditional Architect re-entries) edits `SKILL.md` — serialize vs -09/-10. **-09 also edits `write_dispatch.sh` and the SKILL prose that calls it (SKILL lines 87/181/260/293/314/346/406/578)** — flag below (§2.2/§2.3).

**M4 — Quality.** `STORY-043-10` (Consolidation D.5) **last** — edits `SKILL.md` + `qa.md`, both touched earlier. Merges after -06 (qa.md) and -08/-09 (SKILL.md).

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.claude/skills/sprint-execution/SKILL.md` | 043-08, 043-09, 043-10 | 043-08 → 043-09 → 043-10 | 08 edits §C.3.5 (~286) / §C.6 (~369-383) dispatch gating; **09 edits the `write_dispatch.sh`-call prose at SKILL lines 87/181/260/293/314/346/406/578 — a region the prepopulated table MISSED**; 10 inserts Phase D.5 between §6 (L542) and §7 (L559). All three regions textually disjoint but one file — serialize, rebase each on the prior. |
| `.claude/agents/qa.md` | 043-06, 043-10 | 043-06 → 043-10 | 06 softens Workflow re-run prose (steps 3 & 5, ~L115/L122); 10 appends a Consolidation-mode note to the Mode Dispatch block (~L33-63). Disjoint hunks; 10 rebases on 06. |
| `cleargate-cli/src/lib/readiness-predicates.ts` ↔ `.cleargate/templates/{epic,story,CR,Bug}.md` | 043-02, 043-03 | 043-02 → 043-03 | Different files (predicate source vs templates) — **logical dependency, not a true file collision**. -02 anchors on heading text first; -03's de-numbering then cosmetic. Both correct independently; ordering is for clean acceptance. |
| `.cleargate/scripts/close_sprint.mjs` | CR-070 (merged), 043-05 | n/a (CR-070 done) | CR-070's `execution_mode` migrator (L206) + always-enforced comments are **already in main**. 043-05's dist-assertion + `--assume-ack` de-dup hunks are disjoint. No live collision. |
| `state.json` / execution_mode surfaces | CR-070 (merged), 043-01 | n/a | **Dependency already satisfied in-tree.** 043-01 only removes the consumer read in `pending-task-sentinel.sh`; touches no `state.schema.json`/script line CR-070 owns. |
| `.claude/agents/architect.md` | 043-08 only | — | No collision (sole editor). |
| `cleargate-cli/src/commands/init.ts` | 043-06 only | — | No collision. |

**Corrections vs prepopulated §2.2:** (1) **`SKILL.md` is touched by THREE stories, not two** — 043-09 was omitted; corrected chain 08 → 09 → 10. (2) The `readiness-predicates.ts ↔ templates` row is a logical dependency across *different* files, not a shared-file collision — relabeled. (3) CR-070's `close_sprint.mjs` / `state.json` rows are moot (already merged).

### 2.3 Shared-Surface Warnings
- **`SKILL.md` three-way serial (08 → 09 → 10).** Disjoint text regions, same canonical file. DevOps serializes merges, rebases each later story on the prior, and runs the three-way mirror (canonical → payload via `npm run prebuild` → live via `cleargate init`) ONCE after the LAST of the three lands — not per-story — to avoid intermediate live-drift on the running framework.
- **`qa.md` two-way (06 → 10).** Same atomicity: -10 rebases on -06; mirror-parity `diff -q` canonical ↔ payload post-merge.
- **Scaffold-mirror obligation (canonical → payload → live), per story:** `043-01` (sentinel hook ×3), `043-03` (CR.md/Bug.md), `043-04` (`readiness-gates.md`), `043-05` (`reporter.md` + flashcard `SKILL.md`), `043-06` (`qa.md`), `043-08` (`SKILL.md` + `architect.md`), `043-10` (`SKILL.md` + `qa.md`). DevOps runs `npm run prebuild` + mirror-parity `diff` on EVERY one of these merges (BUG-024 class).
- **`043-05` atomicity.** Keep `close_sprint.mjs` + `reporter.md` + flashcard `SKILL.md` in one story by design (all close-stage); do not split.
- **Live-loop safety (framework runs on itself this sprint).** `043-01` (sentinel), `043-05` (close hardening), `043-08` (conditional Architect dispatch) all edit the LIVE orchestration path. Developer edits canonical + payload only; the **live `/.claude` re-sync (`cleargate init`) is DEFERRED to Gate-4 doc-refresh** — re-syncing mid-sprint would alter THIS sprint's own execution loop before merge to main.

### 2.4 Lane Audit
All 11 work items are `standard` lane (confirmed against the 7-check rubric). No fast-lane candidates: each touches a forbidden surface (gates, `readiness-predicates.ts`, `work-item-type.ts`, config-adjacent `cli.ts`), spans >2 files, carries med/high bounce exposure, or modifies the live orchestration loop.

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| CR-070 (closure) | standard | gate-semantics surface; closure verifies schema-v3 + advisory hatch in-tree |
| 043-01 | standard | flashcard-gate enforcement change; live-loop hook + 3-way mirror |
| 043-02 | standard | readiness-predicate evaluator change; gate-correctness core |
| 043-03 | standard | template+gate reconciliation across 6 files; high bounce exposure |
| 043-04 | standard | WorkItemType union + gate block; type-system + canonical mirror |
| 043-05 | standard | close-cascade fail-closed + reporter v2; live-loop, high exposure |
| 043-06 | standard | README+init banner+qa.md; >2 files, agent-prompt mirror |
| 043-07 | standard | wiki-ingest narrowing with byte-parity floor; med exposure |
| 043-08 | standard | live dispatch-count change to sprint loop; high exposure, safeguard |
| 043-09 | standard | CLI surface + orphan delete + dispatch-marker; 3 files |
| 043-10 | standard | new sprint-loop phase across SKILL.md+qa.md+mirrors; high exposure |

### 2.5 ADR-Conflict Flags
- **Adversarial-core invariant (043-08).** Five-agent split + worktree-per-story isolation are locked. 043-08 narrows *when* the Architect re-enters but the non-removable safeguard ("ANY pre-gate flag — demotion, `arch_bounce`, surface drift, new-deps, structural, OR exit-2 scan-failure — still dispatches the live Architect") preserves the check on every risky path. No conflict, PROVIDED the safeguard prose lands verbatim in both `SKILL.md` and `architect.md`; QA-Verify greps for it.
- **Gate-semantics invariant (CR-070 / 043-01).** `CLEARGATE_ADVISORY=1` (`gate-mode.ts:isAdvisory()`) is the SOLE downgrade lever. 043-01 must not introduce a second downgrade; bypass precedence fixed: `SKIP_FLASHCARD_GATE=1` > `_off-sprint` > `CLEARGATE_ADVISORY=1` > block.
- **Correctness-floor invariant (043-07, 043-10).** Both gate an optimization/transformation behind a full-fidelity floor: 043-07's `cleargate wiki build` byte-parity test; 043-10's QA-Verify full-suite red→revert. Un-optimized path stays canonical.
- **Worktree-isolation invariant (043-10).** D.5 runs `/simplify` on `git diff main...sprint/S-NN` as ONE consolidation commit on the *sprint* branch after story worktrees are torn down (§C.7) — never re-enters a story worktree; `*.red.node.test.ts` immutability preserved.
- **No DB/MCP/auth-flow surface touched by any story** — all 11 live under `.claude/**`, `.cleargate/**`, or `cleargate-cli/src/{lib,commands,util,cli.ts}`.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| CR-070 not merged before STORY-043-01 → sentinel still reads a live execution_mode | Hard-sequence CR-070 first in M1; 043-01 preflight asserts execution_mode is gone |
| Scaffold edit mirrored to canonical but not live (BUG-024 class) | DevOps `npm run prebuild` + mirror-parity diff on every scaffold-touching merge |
| Predicate change (043-02) regresses an existing gate | Regression-test all 7 gate blocks before merge; 043-02 ships before 043-03 |
| Sprint is large (10 stories + CR) | Milestone-gated; M1 (integrity) ships first and is independently valuable |
| Close hardening (043-05) changes the close flow mid-sprint | 043-05 verified against fixtures; does not alter THIS sprint's close path until merged to main |

## Metrics & Metadata
- **Expected Impact:** gate false-negatives → 0; flashcard gate enforces; session token tax trends down; −≥75% per-edit wiki recompiles; standard-lane dispatches 6→5; cross-story consolidation pass added.
- **Priority Alignment:** M1 (gate correctness / integrity) is highest priority and independently shippable; M3/M4 (efficiency/quality) follow.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** `CR-070` first (unblocks STORY-043-01), then the rest of M1. M1 is the integrity core — if the sprint must be cut, M1 alone is a complete, valuable release.
- **Relevant Context:** the source-level framework self-review (EPIC-043 context_source), `.cleargate/FLASHCARD.md:41/148` (the recurring heading bug), and the verified blocked items (BUG-033 discovery-checked, BUG-034 repro, EPIC-031 reuse-audit) that this sprint un-falses.
- **Constraints:** do NOT touch the adversarial 5-agent split, gate semantics beyond making them fire correctly, worktree isolation, or the MCP store. EPIC-044 (dispatch architecture) is explicitly NOT in this sprint. Every scaffold edit mirrors canonical→payload→live.
