---
sprint_id: SPRINT-47
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: manual
status: Draft
start_date: 2026-11-17
end_date: 2026-11-21
synced_at: null
created_at: 2026-11-16T07:48:36.285Z
updated_at: 2026-11-16T07:48:36.285Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-16T07:52:34Z
  transition: ready-for-execution
epics:
  - EPIC-065
stories:
  - STORY-065-01
  - STORY-065-02
  - STORY-065-03
  - STORY-065-04
  - STORY-065-05
  - STORY-065-06
execution_mode: v2
area: sprint-execution,scripts,agent-prompts,templates,gates
sprint_goal: |
  Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".
proposals: []
context_source: |
  Decomposes EPIC-065 (INITIATIVE-002 WS-1, approved by the owner 2026-11-16) into STORY-065-01..06.
  Absorbs CR-128 (into STORY-065-01) and CR-129 (into STORY-065-06). Folds in two SPRINT-46 intake
  items: upgrade keeping user keys in gate-checks.json (STORY-065-02) and a seal for new red files
  after the Developer's commit (STORY-065-05). First sprint here on the new loop (cleargate 0.31.2).
last_contradict_sha: "8602281229209ffa67d2519a1bd438d6a60591fea806b13ba184270807116032"
---

# SPRINT-47: Proof Decides Done

## 0. Stakeholder Brief

This is the third slice of INITIATIVE-002 (Evidence-First Execution Loop), and the one the
initiative was started for. Across the repositories that run ClearGate, most defects were found
after every agent check had passed: about 130 at walkthroughs in doc_processor, more than 70 in
live runs in new_app, about 47 by real runs here. Today nothing in the loop asks how an item will be
proven, nothing records that it was, and an item is Done the moment it merges. This sprint makes
each item say up front how it will be proven, has a script run that proof and keep the result, holds
the item out of Done until the result exists, and makes close and the report show any gap.

It is the first sprint here on the loop SPRINT-46 shipped (fast, standard and runtime lanes, sealed
red tests, merge by script). At its close the new rules go live here and ship as `cleargate` 0.32.0.

- **Sprint Goal:** Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".
- **Business Outcome:** "done" means proven at a stated tier; an unproven item is visible as such, at merge, at the walkthrough, at close and in the report.
- **Risks (top 3):** the sprint changes the merge, the Done transition and close that its own loop runs; three stories edit the same skill file; the release gate is one sandbox run, not a field sprint. See Risks & Dependencies.
- **Metrics:** in the release sandbox run every item has an evidence file or is listed "built, not proven"; a proof that fails blocks its merge and sends the item back; Done is never written without evidence.

## Sprint Goal

Make proof decide Done: every item declares a proof tier, a script records each proof as evidence, an item becomes Done only when evidence for its tier exists, and close and the report show the tier promised and the evidence produced, or "built, not proven at tier X".

## 1. Consolidated Deliverables

<!-- cleargate:ignore-ids -->The Proof column applies INITIATIVE-002 rule 1 by hand, as in SPRINT-45 and SPRINT-46: the recorder this sprint builds is not live until Gate 4.<!-- /cleargate:ignore-ids --> Lanes are computed by `assign_lane.mjs` at kickoff; the values below are its output on the drafts.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `STORY-065-01` | Items declare a proof tier <!-- cleargate:ignore-ids -->(absorbs CR-128)<!-- /cleargate:ignore-ids --> | runtime | SDR | y | med | Unit + integration — `proof-declared` reds; preflight on a fixture sprint; before/after gate sweep over `pending-sync/` unchanged |
| `STORY-065-02` | Record evidence for a proof | runtime | SDR | y | med | Unit + integration + clean-room — recorder reds on a temp repo; init/upgrade reds; `cleargate init` from the packed tarball shows the `proof` block |
| `STORY-065-03` | Done waits for evidence | standard | SDR | after 02's contract | low | Unit + integration — Done-guard reds; `merge_story.mjs` on a temp repo: pass → Done, pending → Sprint Review |
| `STORY-065-04` | Prove stage in the build loop | standard | SDR | after 02's contract | med | Unit + docs pins — `stagesFor` per lane; verdicts on the runner and serial paths; skill-text pins |
| `STORY-065-05` | Holdout scenarios and property tests | standard | SDR | y | med | Unit + integration — view and count reds; `seal_red.mjs --amendment` on real git |
| `STORY-065-06` | Close and report show proof <!-- cleargate:ignore-ids -->(absorbs CR-129)<!-- /cleargate:ignore-ids --> | standard | SDR | after 02's contract | med | Unit + integration — a fixture sprint closed end to end with one unproven item; Step 2.5 on the new report template |

## 2. Execution Strategy
*(Written by the Architect during the Sprint Design Review at kickoff: architect-reader ×6, then architect-synth, which writes §§2.1–2.5, the Wave Assignment table and `plans/waves.json`. Expected shape, for review only: one contract, `contract/S-47-evidence` — the `evidence/<ID>.json` schema and `lib/proof.mjs` exports owned by STORY-065-02 — consumed by 065-03, 065-04 and 065-06; SKILL.md is shared by 065-01, 065-04 and 065-06 in different sections.)*

### 2.1 Phase Plan
Pending the Sprint Design Review.

### 2.2 Merge Ordering (Shared-File Surface Analysis)
Pending the Sprint Design Review.

### 2.3 Shared-Surface Warnings
Pending the Sprint Design Review.

### 2.4 Lane Audit
Pending the Sprint Design Review; computed lanes are in §1.

### 2.5 ADR-Conflict Flags
Pending the Sprint Design Review.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| The sprint changes `merge_story.mjs`, `update_state.mjs` and `close_sprint.mjs`, which its own merges and close run | Canonical only; the live loop is unchanged until Gate 4 (rule 5), so the sprint merges and closes on 0.31.2. |
| SKILL.md (both hosts) is edited by 065-01 (§A.5), 065-04 (§C.0.1, §C.7, §D) and 065-06 (§E.2) | Different sections; the SDR orders the merges and the later stories re-sync before merging. |
| 065-03, 065-04 and 065-06 read the evidence file 065-02 writes | Contract-first: the schema and `lib/proof.mjs` exports are frozen on a contract branch at kickoff, so the three build in parallel against it. |
| The release gate is one sandbox run, not a field sprint, and the release ships before dispenser_adapter uses it | Same as 0.31.0: dispenser_adapter's next sprint is ordinary field use and its defects ship as patches. The sandbox run covers each tier the sandbox can reach. |
| A container proof in the sandbox needs Docker | OrbStack is available here; the run-7 setup script gains a Postgres 18 container for the container item. |
| Nested-cli layout: every path is inside `cleargate-cli` | Same as SPRINT-46: stories build in nested cli worktrees and merge locally into cli `main`. |

## Metrics & Metadata
- **Expected Impact:** every item proven at a stated tier or shown as not proven; a failed proof caught before merge rather than at the walkthrough; Done never written without evidence.
- **Priority Alignment:** INITIATIVE-002 WS-1, the owner's first-ranked workstream; EPIC-065 was approved with all eight recommendations on 2026-11-16 ("happy with recommendations"). The north-star metrics in EPIC-065 §1 are measured over the next three sprints here and in dispenser_adapter.

## Prior work

- [[EPIC-065]] — the epic this sprint decomposes; [[INITIATIVE-002]] its parent.
- [[SPRINT-46]] — built the loop this sprint extends (stage table, sealed reds, merge by script, kickoff baseline) and logged the intake items folded in here.
- [[EPIC-066]] — that loop's epic; EPIC-065 §6 Q10 puts the prove step in its stage table.
- [[CR-128]], [[CR-129]] — absorbed; archived at Gate 4.
- [[CR-082]] — deferred verification, generalised by the evidence file.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** STORY-065-02's contract (evidence schema, `lib/proof.mjs`), then every story in parallel against it.
- **Relevant Context:** EPIC-065 (pending-sync), `cleargate-cli/scaffold/core/.cleargate/scripts/`, `cleargate-cli/scaffold/hosts/{claude,codex}/`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/`, `.cleargate/sprint-runs/SPRINT-46/intake.md`.
- **Constraints:** canonical edits only; local merges only; no push or publish during the sprint.

**Before kickoff:**
1. Owner approves the six stories, their open questions and this plan (Gate 1).
2. Sprint Design Review writes §2 and `waves.json`; owner confirms it and the Goal Acceptance Check (Gate 2). Preflight (Gate 3).

**Hand-applied rules from INITIATIVE-002** (copied into `sprint-context.md` Cross-Cutting Rules at kickoff):

1. **Proof per item.** Each item is Done only when the evidence named in its Proof column exists, recorded in its QA-Verify report or in `sprint-runs/SPRINT-47/evidence/`.
2. **Fixed roster.** The six items above are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-47/intake.md` and enters only with the owner's recorded OK in §6.
3. **Lanes by risk.** Lanes are `assign_lane.mjs`'s; the Architect may only raise one.
4. **Recount at close.** The orchestrator records a hand recount of rework from git and dispatch metadata beside `sprint_metrics.mjs` in the close Brief.
5. **Loop unchanged under the sprint.** No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` until Gate 4. This matters more than usual: the sprint changes the merge, the Done transition and close, which its own loop runs.

**At Gate 4:**
1. Re-sync the live copy here from cli `main` after the close.
2. Release `cleargate` 0.32.0 (new features, so a minor bump): CHANGELOG, `release(cleargate): v0.32.0 — <summary>`, tag, push cli `main` and the tag, `npm publish`, GitHub release with the registry tarball (checked against the publish shasum).
3. Archive CR-128 and CR-129 as absorbed (`superseded_by`), push the meta-repo `main`.

**Goal Acceptance Check** (proposed; confirmed at Gate 2) — Tier: live:
- (a) cli `npm test` has 0 failures at the final cli `main`, and `npm run test:integration` fails only on tests in the kickoff baseline list.
- (b) Clean-room: the packed release candidate installed into a temp Go repo whose `Makefile` has an `e2e:` target seeds `proof.unit` `go test ./...` and `proof.container` `make e2e`; `cleargate new story` shows `proof_tier` and `## Proof`; `cleargate gate check` names `proof-declared` on the unedited story.
- (c) Sandbox end-to-end run on the release candidate (plain layout, as SPRINT-46 run 7), a throwaway Go repo with four items: one `unit`; one `container` against a Postgres 18 container with one `@holdout` scenario; one `human`; one `container` item whose first proof fails on purpose. Pass when: every item has `evidence/<ID>.json` or is listed "built, not proven"; the failed proof blocked that merge and the item went back to the Developer; the holdout was absent from the QA-Red and Developer prompts and its test landed in a `qa-red(<ID>): amendment` commit; the human item waited in Sprint Review until the walkthrough confirmation; the report has the proof table and `goal_verdict`; the run halted only at plan confirmation, the walkthrough and Gate 4.

**Considered, not in the roster** (SPRINT-46 intake; each is drafted only on the owner's word):
- A CR redefining the sprint token split (CR-035) from measured totals; it edits `prep_reporter_context.mjs` and `reporter.md`, as STORY-065-06 does.
- `update_state.mjs --reopen` for an escalated item (the skill's re-run of an escalated item fails today).
- `.script-incidents/` files tracked in target repos (the generated root ignore omits them).
- Close leaving `main` with modified wiki pages, so the next preflight fails until a hand commit (BUG-086, S32).
- Cheaper field tests: a loop replay harness, one-story sandboxes, the full run once per release (the owner's question of 2026-11-15); an epic of its own.
- A size cap on the Reporter bundle (about 614KB against a 160KB target).

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-065 has STORY-065-01..06.
- [ ] All work items 🟢 — awaiting the owner's answers to the stories' open questions.
- [ ] Gate 2 SDR §2 Execution Strategy written by Architect.

## 5. Gate Checklist

- [ ] **Gate 1** — EPIC-065 approved (2026-11-16); the six stories await approval.
- [ ] **Gate 2** (Sprint Ready) — SDR §2 and the Goal Acceptance Check confirmed.
- [ ] **Gate 3** (preflight) — `cleargate sprint preflight SPRINT-47`.
- [ ] **Gate 4** (close) — after all items merge and the walkthrough.

## 6. Execution Log

- 2026-11-16 · Planned. EPIC-065 §6 answered as recommended by the owner ("happy with recommendations"); surfaces re-mapped at cli 99cbfd7; six stories drafted, every story gate passes.
