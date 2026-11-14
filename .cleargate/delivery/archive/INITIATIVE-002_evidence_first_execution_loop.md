---
initiative_id: INITIATIVE-002
remote_id: null
source_tool: manual-paste
status: "Triaged"
synced_at: null
triaged_at: "2026-11-14T00:00:00Z"
spawned_items: [EPIC-064]
created_at: 2026-11-13T21:55:26.174Z
updated_at: 2026-11-13T21:55:26.174Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
area: sprint-execution,sprint-planning,templates,agent-prompts,measurement
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T22:00:02Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: manual-paste
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id INITIATIVE-002
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T21:59:35Z
  sessions: []
---

# INITIATIVE-002: Evidence-First Execution Loop

> Commissioned by the owner on 2026-11-14 ("we need the change planned") after a review of the
> sprint loop against peer frameworks and against sprint reports from 13 other repositories that
> run ClearGate. Drafted by the conversational agent from that review; the owner is the author of
> record and edits freely.

## 1. User Flow

Happy path, from the owner's side:

1. **Plan.** The owner states a sprint goal. The agent proposes the proof for it: what will be run,
   on what, and what result counts. The proof names its tier — unit, real container, live service,
   or human. If agents cannot reach the tier, the plan says so in those words.
2. **Shape items.** Each item gets the path its risk needs. A one-condition bug is a short file and
   a short path. A UI or cross-subsystem story gets the full path and a real run. File surfaces and
   neighbouring code are filled in by a tool, not typed by the drafter.
3. **Confirm.** The owner confirms the goal, the proof and the roster once. The roster is then fixed.
4. **Execute.** Agents build and check. An item is Done when the evidence for its tier exists, not
   when its tests are green.
5. **Find something mid-sprint.** A defect the owner or a review finds goes to an intake list. It
   enters the running sprint only by an explicit, recorded admission.
6. **Close.** The report shows, per item and for the goal, the tier that was promised and the
   evidence that was produced. Rework and cost figures come from the event log, so they match what
   git shows.

Alternative flows:

- **Unreachable proof.** The goal needs a live service or device agents cannot reach. The sprint
  closes as "built, not proven at tier X", and the owner's own check is the recorded evidence.
- **Small fix outside a sprint.** A small bug takes the short path on its own, with the same evidence
  rule.
- **Non-TypeScript repository.** The same flow runs on a Go or Python target with no gate bypasses
  caused by the framework's own tooling.

## 2. Diagrams

```
 goal ──► proof named (tier) ──► roster fixed ──► build ──► evidence for tier? ──► Done
                                      ▲                          │ no
                                      │                          ▼
 found mid-sprint ──► intake ──► admitted? ── no ──► next sprint   rework (logged as an event)

 event log ──► rework counts, cost, report      (nothing is hand-counted)
```

## 3. End-to-End Verbal Description

Change the sprint loop so that proof, not process, decides when work is done. Every sprint goal and
every item names the evidence it needs and the tier that evidence lives at, and the loop produces
that evidence or says plainly that it could not. The amount of process an item gets follows its
risk, so small fixes stop paying for the full pipeline and UI or cross-subsystem work gets a real
run. A sprint has one goal and a fixed roster, with a separate intake for what is found along the
way. Rework and cost are derived from one event log. Facts a tool can compute are no longer
authored by hand. The loop works the same on Go and Python targets. Checks that field repositories
built for themselves become supported parts of the framework that survive an upgrade.

Out of scope: the wiki and awareness layer, the MCP server and admin console, the connector
product, and multi-host adapters ([[EPIC-058]]) beyond what the per-stack work needs.

## 4. Business Outcome

Sprints that report "shipped" are shipped: fewer defects reach the owner's walkthrough or a
published release, small work costs less, and the sprint report can be trusted without a recount.

## 5. Success Criteria

Measured on the first three sprints run on a release carrying this work, in this repository and in
one pilot field repository. Targets marked (proposed) were confirmed by the owner on 2026-11-14 (§6).

- Every sprint goal and every item in those sprints names an evidence tier, and the report shows
  the evidence or the words "not reachable by agents" for each.
- Defects found after QA passed (owner walkthrough, review or field report), per shipped item, fall
  by half against the pilot repository's previous three sprints (proposed).
- Rework counts in the sprint report are derived from the event log and agree with a git recount of
  one audited sprint to within 10% (proposed).
- Fewer than 5% of sprint tokens are unattributed to a role (proposed).
- A bug classed as small completes in at most two agent dispatches (proposed).
- No item enters a running sprint without a recorded admission.
- File-surface errors found before dispatch fall below 10% of items, from about half (proposed).
- A Go or Python pilot sprint closes with zero gate bypasses caused by framework tooling.

## 6. Open Questions for AI Triage

All nine were decided by the owner on 2026-11-14 ("all accepted"): each recommendation stands.

- **Question:** In what order are the six workstreams built?
  **Human decision:** Measurement (WS-4) and evidence tiers (WS-1) first. Without measurement nothing else can be judged, and evidence is where the defects are.
- **Question:** Does [[EPIC-055]] (parallel wave scheduling) proceed? Measured wave width is 1.0–1.8 and contract-first is unproven.
  **Human decision:** Pause [[EPIC-055]] until WS-4 can show integration queue time. [[CR-124]] stays as shipped.
- **Question:** [[CR-024]] locked three lanes, but one is used in practice (1 fast-lane item in 77 here). Keep them?
  **Human decision:** Keep the three names. Replace the assignment rubric with risk signals the data supports (UI surface, subsystems crossed, scenario count) and make `runtime` a real state value.
- **Question:** [[EPIC-032]] locked the code map as opt-in and off in target repositories. How are file surfaces generated?
  **Human decision:** From git and search at plan time, without the code map. The lock stands.
- **Question:** Does test-first by a separate agent stay?
  **Human decision:** Keep QA-Red. Adopt the rule that sealed reds assert properties rather than exact shapes. Add holdout scenarios only for items whose tier is a real run.
- **Question:** May the owner's walkthrough remain the only proof for UI work?
  **Human decision:** An agent browser check comes first where the repository has a browser harness. Otherwise the proof is the human tier, and the plan says so.
- **Question:** [[SPRINT-42]] and [[SPRINT-43]] are drafted and overlap WS-2, WS-3 and WS-4. Run them first?
  **Human decision:** No. Fold them under this initiative and re-cut their rosters after decomposition.
- **Question:** Are the targets marked (proposed) in §5 and the pilots confirmed?
  **Human decision:** Yes. Pilots are doc_processor (active, on 0.30.1) and dispenser_adapter (Go).
- **Question:** Are supported override points that survive an upgrade part of this initiative?
  **Human decision:** No. They stay with [[CR-115]] and [[CR-132]]; this initiative only names the override points.

## Evidence this rests on

Read on 2026-11-14 from the reports' own tables. Other repositories' sprints are written as
"<repo> sprint N" on purpose: their IDs are not this repository's IDs.

| Finding | Where it shows |
|---|---|
| Agent checks prove tests match the acceptance criteria. Defects that matter are found later by running the real thing. | doc_processor: about 130 bugs found at owner walkthroughs against about 35 recorded QA bounces. new_app: more than 70 defects found in live or browser runs after all agent checks passed. BA_colleague: bug-fix tax of 42% to 343% in sprints 4 to 10. This repository: about 47 bugs found only by real runs, 19 of them field reports against published versions. |
| Where a real-run check existed, escapes fell. | doc_processor's last era (regression net on 357 real documents): human-found bugs fell from 7–27 per sprint to about 2. LIS_Adapter and dispenser_adapter tie sprint goals to container CI and an end-to-end make target. |
| The loop's instruments are wrong. | Bounce counters undercount in nearly every late-era repository (doc_processor sprint 17: 3 of 10 stories passed first time; the counter implied 87%). Per-role token attribution is unusable everywhere except three mediafi sprints. |
| Sprints fail by growing mid-flight. | new_app sprint 66 went from 15 to 41 items; BA_colleague sprint 7 from 3 to 25; Kurnera sprint 3 took 20 extra. The best sprints had one goal, a fixed roster and a goal check backed by evidence. |
| Artifacts grew without paying for it. | Median story file 7.8 KB in the earliest repository, 41 KB in Kurnera. The §3.1 file-surface table is wrong in about half of stories, and its gate is bypassed in at least four repositories. Bugs run the full pipeline although they bounce less than stories (14% against 23% in new_app). UI stories bounce most (32%). |
| Red tests are the top source of bounces. | In first sprints most architect bounces were defects in the tests themselves; 11 of 15 Kurnera reports record the same. |
| Contract-first is not proven. | mediafi sprint 3 had the best quality in its repository but no better throughput and a higher cost per item; merges stayed serial. Kurnera's six contract-first sprints stayed near 50% first-pass. Average wave width in this repository is 1.0 to 1.8. |
| Non-TypeScript targets hit TypeScript-keyed tooling. | LIS_Adapter and dispenser_adapter (Go): red-file immutability hook, red-test lint and surface gate do not cover Go; the close script needs node tooling. |
| Field repositories already built the fixes locally. | Real-browser walkthrough (new_app, Kurnera); a designer agent that verifies UI in a browser (Kurnera); a real-document regression net at pre-commit (doc_processor); a goal-verification harness (ScopeCraft_v2); a different model writing code than the one checking it (doc_processor, mediafi); spikes with kill criteria (LIS_Adapter, Khma_AI); review passes outside the loop (BA_colleague). |

Limits: the figures come from sprint reports read by parallel readers, not from re-running anything.
Three repositories stopped using the framework with no documented reason.

## Proposed decomposition

Candidate epics, not yet drafted. Each lists the open or shipped work it must absorb, extend or
leave alone.

| # | Workstream | What it adds | Existing work |
|---|---|---|---|
| WS-1 | Evidence tiers and real-run proof | Tier named on goal and item; Done means evidence exists; a real-run step in the loop; holdout scenarios; "not reachable" as a stated outcome | Extends [[CR-110]] (goal acceptance check), [[CR-082]] (deferred verification), [[CR-126]] and [[CR-111]] (test layers). Absorbs [[CR-128]] and [[CR-129]]. Depends on [[EPIC-056]] for environment independence. |
| WS-2 | Process by risk | Short path and short file for small bugs and CRs; rubric that actually assigns lanes | Builds on [[CR-024]] and [[EPIC-022]]. Touches [[CR-130]] and [[CR-119]]. |
| WS-3 | Sprint composition | One goal, fixed roster, intake list with recorded admission, a sizing rule | Extends [[EPIC-013]] (mid-sprint triage). Coordinates with [[EPIC-059]], [[EPIC-060]] and [[EPIC-030]]. No prior work on sizing. |
| WS-4 | Measurement from events | Rework as first-class events; counters and reports derived; per-role cost that reconciles | Builds on [[CR-106]] (event log). Absorbs [[CR-120]] and [[BUG-117]]. Must reconcile with the Correction Tax definition locked in [[EPIC-013]]. |
| WS-5 | Generated facts | File surface and neighbouring code computed at plan time; the surface gate reads the generated list | Fixes the class behind [[BUG-129]], [[BUG-062]] and [[BUG-052]]. Coordinates with [[CR-125]]. Respects the [[EPIC-032]] opt-in lock. |
| WS-6 | Per-stack support | Red-test naming, immutability and lint per language; close tooling with no node dependency in the target | Extends [[EPIC-045]] and [[CR-077]]. Coordinates with [[EPIC-031]] and [[BUG-114]]. |

Locked decisions this work must respect or explicitly reopen:

- Spikes run before the sprint; no second execution unit; no new `state.json` unit ([[EPIC-054]]).
- The flashcard gate is sequential by design ([[EPIC-013]]); [[CR-121]] already proposes relaxing
  it and is not part of this initiative.
- The scheduler sits above the wave launcher and merges stay serial ([[EPIC-055]], [[CR-124]]).
- The test stack is read from the target, never hard-coded ([[EPIC-045]], [[CR-077]]).
- A clean-room run is required for install and host changes ([[EPIC-058]]).

## Prior work

Wiki query run 2026-11-14. The redesign does not start from zero.

- Self-review and loop redesign: [[EPIC-043]], [[EPIC-044]], [[EPIC-013]], [[CR-124]] (all
  Completed); [[EPIC-059]], [[EPIC-060]] (Draft).
- Evidence and proof: [[CR-128]], [[CR-129]] (Draft); [[CR-110]], [[CR-082]], [[CR-126]],
  [[CR-111]] (Completed); [[EPIC-056]] (Draft).
- Lanes and templates: [[EPIC-022]], [[CR-024]] (Completed); [[CR-130]] (Draft); [[CR-119]]
  (Triaged).
- Composition: [[SPRINT-42]], [[SPRINT-43]], [[EPIC-055]], [[EPIC-030]], [[EPIC-031]] (Draft);
  [[EPIC-054]] (Completed).
- Measurement: [[CR-120]] (Draft); [[CR-106]], [[BUG-068]], [[BUG-069]] (Completed); [[BUG-117]]
  (Draft).
- Generated facts: [[EPIC-032]], [[CR-091]] (Completed); [[BUG-129]], [[BUG-062]], [[CR-125]]
  (Draft); [[BUG-052]] (Triaged).
- Per-stack: [[EPIC-045]], [[CR-077]] (Completed); [[EPIC-058]] (Draft); [[BUG-114]] (Triaged).
- No prior work found for: holdout scenarios, browser verification by QA, sprint sizing rules,
  undercounting of bounce counters.

## Existing Surfaces

- Loop specification: `.claude/skills/sprint-execution/SKILL.md` (canonical in
  `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/`).
- Agent contracts: `.claude/agents/qa.md` (lane-aware playbook, verdict order),
  `.claude/agents/developer.md`.
- State and events: `.cleargate/scripts/update_state.mjs`, `state-events.mjs`, `state.schema.json`.
- Surface and collision: `.cleargate/scripts/collision_surface.sh`, `file_surface_diff.sh`,
  `.claude/hooks/pre-commit-surface-gate.sh`.
- Red-test checks: `.cleargate/scripts/qa_red_lint.mjs`, `pre_gate_runner.sh`.
- Cost: `.claude/hooks/token-ledger.sh`, `.cleargate/scripts/count_tokens.mjs`.
- Close: `.cleargate/scripts/close_sprint.mjs`, `prep_reporter_context.mjs`.
- Real-run procedure, manual today: `.cleargate/knowledge/clean-room-verification.md`.
