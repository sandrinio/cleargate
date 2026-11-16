---
epic_id: EPIC-065
parent_ref: INITIATIVE-002
parent_cleargate_id: INITIATIVE-002
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-11-16T03:00:00Z
ambiguity: 🟢 Low
area: sprint-execution,templates,gates,agent-prompts,scripts
context_source: INITIATIVE-002 workstream WS-1 and the owner's nine decisions of 2026-11-14; the SPRINT-45 release-candidate field trial in dispenser_adapter (.cleargate/field-trials/2026-11-dispenser-sprint45-rc.md, findings W-D1 and W010-3); canonical cleargate-cli main at f846d9a, surfaces mapped 2026-11-14 and re-mapped 2026-11-16 at 99cbfd7 after SPRINT-46; §6 answered as recommended by the owner 2026-11-16
owner: sandrinio
target_date: null
created_at: 2026-11-14T19:04:01.387Z
updated_at: 2026-11-14T19:04:01.387Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-16T07:38:44Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-065
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-14T19:10:28Z
  sessions: []
last_contradict_sha: 6cf4b7f1365529740a7d5fcebbef5735f4403ecdab53373d049827c42a468beb
---

# EPIC-065: Proof Decides Done

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Every sprint goal and every story, CR and bug declares a proof tier (unit, container, live, human) and how it is proven; a script records the proof as an evidence file; an item reaches Done only when evidence for its declared tier exists; sprint close and the report show, per item and for the goal, the tier promised and the evidence produced, or "built, not proven at tier X".</objective>
  <architecture_rules>
    <rule>Generalise what exists, do not add a parallel mechanism: the evidence file generalises CR-082's deferred-verify/&lt;ID&gt;.json; the goal tier extends CR-110's Goal Acceptance Check; "merged, awaiting proof" uses the existing `Sprint Review` state in constants.mjs.</rule>
    <rule>Evidence is written only by `record_evidence.mjs`, never hand-authored by an agent. A command-tier proof is run by the script, not by an LLM agent.</rule>
    <rule>Stack-neutral: no step may depend on package.json or Node in the target's own code. Proof commands come from the item or from gate-checks.json, whatever the language.</rule>
    <rule>Scripts and templates change in cleargate-cli/scaffold/core; agent prompts and the skill change in scaffold/hosts/claude AND their scaffold/hosts/codex counterparts in the same story.</rule>
    <rule>No new state.json work unit and no new story state (EPIC-054 lock). Merges stay serial (EPIC-055, CR-124).</rule>
    <rule>An init/upgrade change (seeding the gate-checks proof block) is not Done until a clean-room install shows it (EPIC-058 rule 1).</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/story.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/CR.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/Bug.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/record_evidence.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs" action="modify" />
    <file path="cleargate-cli/src/lib/readiness-predicates.ts" action="modify" />
    <file path="cleargate-cli/src/init/detect-test-stack.ts" action="modify" />
    <file path="cleargate-cli/src/commands/upgrade.ts" action="modify" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml" action="modify" />
    <file path="cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
In every repository that runs ClearGate, "QA passed" is not the same as "it works". doc_processor
found about 130 bugs at owner walkthroughs against about 35 QA bounces; new_app found more than 70
defects in live runs after every agent check passed; this repository found about 47 bugs only by
real runs (INITIATIVE-002, "Evidence this rests on"). Where a real-run check existed, escapes fell.
Today nothing in the loop asks how an item will be proven, nothing records that it was, and DevOps
marks a story Done at merge. The field trial added a sharper case: in dispenser_adapter (Go) the
pre-gate scan has never run the configured `make check` or `go vet` in four sprints, because every
command step is guarded by `package.json`, and the skip is logged as INFO.

**What changes:** each goal and item names its proof tier up front; a script runs or records the
proof; Done waits for it; the report shows it, or says plainly that it was not reached.

**Success Metrics (North Star)** (INITIATIVE-002 §5, measured on the first three sprints on a
release carrying this epic, here and in the dispenser_adapter pilot):
- Every sprint goal and every item names a proof tier, and the report shows an evidence pointer or
  "not reached at tier X" for each: 100%.
- Defects found after QA passed (owner walkthrough, review or field report) per shipped item fall by
  half against the pilot's previous three sprints.
- A Go pilot sprint closes with zero checks skipped or bypassed because of framework tooling.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Tier vocabulary `unit | container | live | human`, declared on the sprint goal (Goal
      Acceptance Check) and on every story, CR and bug (frontmatter `proof_tier` plus a `## Proof`
      section: the command or steps, and the expected result). Absorbs CR-128.
- [ ] Readiness predicate `proof-declared` for story, CR and bug at ready-for-execution, with a
      cut-over so the existing backlog does not turn red; preflight requires it for every sprint item.
- [ ] `record_evidence.mjs`: runs a command-tier proof (or records a human check) and writes
      `<sprintDir>/evidence/<ID>.json` (tier, command or note, exit code, last 40 lines of output,
      commit sha, time, recorder). Generalises CR-082's deferred-verify file, which it replaces.
- [ ] `gate-checks.json` gains a `proof` block (`unit`, `container`, optional `browser`) seeded by
      init's stack detection; an item may override with its own command.
- [ ] Done needs evidence: a merged item without evidence for its tier waits in `Sprint Review`;
      `update_state.mjs` refuses `Sprint Review → Done` without it.
- [ ] A prove step in the loop: for unit and container tiers, after QA-Verify and before merge, run
      by the script; for live and human tiers, at sprint level in the walkthrough phase. Where
      `proof.browser` is configured, the browser check runs before the human walkthrough.
- [ ] Holdout scenarios for container and live items: tagged `@holdout` in the Gherkin, removed from
      QA-Red's and the Developer's context, written and run by QA-Verify at the prove step.
- [ ] QA-Red rule: sealed red tests assert properties, not exact shapes (owner decision 2026-11-14).
- [ ] Close and report: close_sprint's deferred-verification step becomes the evidence step for all
      items; an item without evidence is listed as "built, not proven at tier X" and needs the
      human's ack; the report gets a per-item proof table and a recorded goal verdict (absorbs CR-129).
- [ ] The evidence step reads the sprint's kickoff `baseline.json` (built by [[EPIC-066]]) so an old
      failure on the sprint base is not recorded against an item.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Building a browser harness for any repository (only the config hook that runs one if present).
- The CI verification layer (EPIC-056) and environment independence of the container tier.
- Lane rubric and short paths for small items (WS-2), generated file surfaces (WS-5), sprint
  composition and the approve command (WS-3), the remaining measurement work (WS-4).
- Parallel wave scheduling (EPIC-055, paused by owner decision).
- The stack-neutral pre-gate scan (W-D1) and the kickoff baseline (W010-3): moved to [[EPIC-066]]
  by owner decision 2026-11-14, because the new build step depends on them. They ship in SPRINT-46,
  before this epic.
- Re-grading archived items: completed work keeps its records as they are.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Stack neutrality | Every step runs on a Go target with no `package.json` (the dispenser_adapter pilot). Verified by the pilot sprint, not by reasoning. |
| Cost | The prove step adds no LLM dispatch for unit and container tiers (script only). Holdout scenarios add QA-Verify work only on container and live items. |
| Security | Evidence keeps at most the last 40 output lines and never the environment; `record_evidence.mjs` does not echo variables whose names contain TOKEN, SECRET, KEY or PASSWORD. |
| Compatibility | Items created before the release are not failed retroactively by the readiness predicate; they must declare a tier only when they enter a sprint. |
| Multi-host | Prompt changes land in the Claude and Codex host files together; the serial-dispatch rendering (`dispatch-serial.md`) gets the same prove step. |

## Existing Surfaces

> Re-mapped 2026-11-16 against canonical `cleargate-cli` main (99cbfd7), after SPRINT-46 rewrote the build loop.
> The 2026-11-14 map (f846d9a) is superseded: `launch_wave.mjs` is no longer the runner path and DevOps no longer sets Done.

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:545-591` — already reads `proof_tier` from the item frontmatter and the first line of the first fenced block under `## Proof` (`parseProofCommand`) into `commands.proof {tier, command}`. The `## Proof` format this epic declares is the one this parser reads.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:66-95` (VERIFY) — step 2 already runs `commands.proof.command` and reports `PROOF: pass|fail|n/a`; the qa-verify schema in `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:32-40` carries `proof`, which nothing reads. The agent's run is not recorded as evidence.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs:92-136` — reads `proof_tier`; `container` or `live` puts an item on the `runtime` lane, a tier other than `unit` keeps it off `fast`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs:22-60` — the stage table (`STAGE_NAMES`, `STAGE_DEFS`, `LANE_STAGES`, `stagesFor`). Every stage is an agent except `merge` (`kind: 'barrier-script'`, `merge_story.mjs`). `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:109` stops at the first barrier-script; the orchestrator runs it (SKILL §C.0.1, §C.7).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:377` — writes `Done` straight after the merge via `update_state.mjs`; `:417-422` reads the kickoff `baseline.json` and `qa.test_waiver`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:35-61` — states and `STATE_TRANSITIONS`; `Sprint Review → Done` exists, no script moves an item into `Sprint Review`, and `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs:425-448` checks only that the target state is valid (`STATE_TRANSITIONS` is not consulted; [[BUG-075]]).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1172-1388` — Step 2.9, the CR-082 deferred-verification gate, reads `deferred-verify/<ID>.json`; nothing in `src/` or `scaffold/` writes that file. Step 2 (`:488-504`) refuses a non-terminal item; the no-flag pass halts for the ack at `:1533-1546`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs:21-29,229` — `baseline.json` `{sprint_id, base_sha, command, exit_code, failing[], tail[], recorded_at}`; read by `merge_story.mjs`, `prep_qa_context.mjs` and `prep_reporter_context.mjs`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:58-65` — QA-Red and the Developer get `Item file: <path>`, the raw item; `cleargate-cli/scaffold/core/.cleargate/scripts/seal_red.mjs:192` counts scenarios with `countScenarios` (`cleargate-cli/scaffold/core/.cleargate/scripts/qa_red_lint.mjs:381`), which is not tag-aware.
- **Surface:** `cleargate-cli/src/init/detect-test-stack.ts:152,203,233-304` and `cleargate-cli/src/commands/upgrade.ts:787-796,1236-1264` — init seeds only `qa.test`, `qa.typecheck`, `arch.typecheck`; upgrade overwrites `gate-checks.json` and restores those three plus `qa.test_waiver`, so any other user key (a `proof` block included) is lost.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:48,188-214,1270-1285` — predicate grammar and dispatch; no predicate applies a `created_at` cut-over today (the `test-layers-declared` comment records why a `created_at_version` compare cannot work). `cleargate-cli/src/commands/sprint.ts:1637-1784` — preflight check 5 reads each item's cached gate result.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md:15-19` (Goal Acceptance Check, no tier); `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md:44-45` and `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:709-712` (OD-4: the verdict is never written to the report).
- **Coverage of this epic's scope:** partial, about 45%. The `## Proof` reader, the QA-Verify proof run, the tier-driven lane, the stage table, the baseline and the deferred-verify close gate carry the shape; the recorder, the Done guard, the prove stage, holdout filtering and the proof table are new.

## Prior work

- [[INITIATIVE-002]] — parent; WS-1 is defined there, with three of its points already decided on 2026-11-14 (red tests assert properties; holdouts only for real-run tiers; browser check first where a harness exists, else the human tier).
- [[CR-110]] (Completed) — Goal Acceptance Check; extended here with a tier.
- [[CR-082]] (Completed) — deferred verification and the close gate; generalised here into the evidence step.
- [[CR-126]] (Completed) — epic Testing Strategy with a real-host level; this epic carries the idea to items and to Done.
- [[CR-111]] (Completed) — test-layer counts; kept, with the tier beside them.
- [[CR-128]] (Draft) — real-host proof row for CRs and bugs; absorbed (superseded by the tier).
- [[CR-129]] (Draft) — goal verdict as a structured field; absorbed.
- [[EPIC-058]] (Draft) — clean-room rule and drivers; the precedent for live-tier evidence.
- [[EPIC-056]] (Draft) — CI verification layer; related, not a dependency (see §6 Q8).
- [[BUG-066]], [[BUG-054]], [[BUG-113]] — examples of a pass without real evidence; not fixed here.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** CR-082's `deferred_verification` plus close_sprint Step 2.9 (`close_sprint.mjs:1037-1233`), with CR-110's Goal Acceptance Check for the goal.
- **Why isn't extension / parameterization / config sufficient?** It is mostly extension, and the epic is built that way: the evidence file is the deferred-verify file generalised, and the Done wait reuses an existing state. But the existing surface is opt-in (most stories declare nothing), story-only (no CRs or bugs), has no writer (nothing ever produces the file), and is checked only at close, so Done is still granted at merge. A tier on every item, one script that writes evidence, and a guard on Done are the minimum that makes proof decide Done rather than describe it.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/scaffold/core/.cleargate/templates/story.md`, `CR.md`, `Bug.md` — `proof_tier` frontmatter; `## Proof` section (tier, a fenced block whose first line is the command, expected result, reason when the tier is `human`); `@holdout` guidance in the Gherkin section. A new `## ` heading shifts positional `section(N)` criteria, so `readiness-gates.md` indexes and `test/docs/gate-section-index-pinning.node.test.ts` move with it.
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md` — Goal Acceptance Check gains `Tier:`.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`, `cleargate-cli/src/lib/readiness-predicates.ts` — closed-set predicate `proof-declared` (story, CR, bug at their ready transitions): a valid tier, a `## Proof` section with a command or steps, a reason for `human`, and at least one `@holdout` scenario for `container` and `live`; applied to items whose `created_at` is on or after the release cut-over date.
- `cleargate-cli/src/commands/sprint.ts` — preflight check 5 also requires `proof_tier` on every item entering the sprint, whatever its age.
- `cleargate-cli/scaffold/core/.cleargate/scripts/record_evidence.mjs` (new) — `record_evidence.mjs <ID> [--tier T] [--worktree W] [-- <command>]` or `--human "<what the owner checked>"`; writes `<sprintDir>/evidence/<ID>.json`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json`, `cleargate-cli/src/init/detect-test-stack.ts`, `cleargate-cli/src/commands/upgrade.ts` — `proof: {unit, container, browser}` seeded from the detected stack; upgrade keeps every user key the package does not define and every user value under `proof`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs`, `wave_runner_args.mjs`, `wave_runner.js` — a `prove` barrier-script stage before `merge` on every lane.
- `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs`, `update_state.mjs`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md` — merge leaves an item without passing evidence in `Sprint Review`; `update_state.mjs` refuses `Done` without it; the protocol defines Done by evidence.
- `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs`, `seal_red.mjs`, `qa_red_lint.mjs` — a holdout-free item view for the story plan, QA-Red and the Developer; tag-aware scenario count; a seal mode for QA-Verify's holdout tests added after the Developer's commit.
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs`, `prep_reporter_context.mjs`, `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md` — Step 2.9 becomes the evidence step for every item; per-item proof table; `goal_verdict` and `goal_verdict_basis` frontmatter (CR-129).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `reporter.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, and the Codex `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `reporter.toml`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md` — prove stage and walkthrough proof, holdouts, property-not-shape rule, Done timing, OD-4 reversed.

**Data Changes:**
- Work-item frontmatter: `proof_tier: unit | container | live | human` (stories, CRs, bugs). Hotfixes keep their own `## 3. Verification Steps` and get no tier.
- `gate-checks.json`: `proof: { unit, container, browser }` (empty string = not configured).
- `<sprintDir>/evidence/<ID>.json`: `{ id, tier, status: pass|fail|pending, command | note, exit_code, tail (≤40 lines, secrets redacted), sha, recorded_at, recorded_by }`. `deferred-verify/` is read by close for one release, then retired.
- `state.json`: no new state and no new field; a merged item without evidence sits in the existing `Sprint Review`.

## 5. Acceptance Criteria

```gherkin
Feature: Proof decides Done

  Scenario: A story is proven at its tier and reaches Done
    Given STORY-A declares proof_tier "container" and its Proof command is "make e2e"
    And QA-Verify passed STORY-A
    When the prove step runs record_evidence.mjs for STORY-A and the command exits 0
    Then evidence/STORY-A.json records tier "container", exit code 0, the commit sha and the last 40 output lines
    And STORY-A can move from Sprint Review to Done

  Scenario: Missing evidence holds an item out of Done
    Given STORY-B declares proof_tier "container" and has no evidence file
    When DevOps runs update_state.mjs STORY-B Done
    Then the transition is refused with "STORY-B has no container-tier evidence"
    And STORY-B stays in Sprint Review

  Scenario: A human-tier item is proven at the walkthrough
    Given BUG-C declares proof_tier "human" with the reason "agents cannot reach the live controller"
    When the owner confirms the fix during the walkthrough and the orchestrator records it with record_evidence.mjs --human
    Then evidence/BUG-C.json records tier "human" and the owner's confirmation text
    And BUG-C can move to Done

  Scenario: Close lists an unproven item instead of hiding it
    Given STORY-D is merged and has no evidence for its declared tier "live"
    When close_sprint.mjs runs
    Then the close output lists "STORY-D built, not proven at tier live"
    And the close halts for the human's acknowledgement
    And the report's proof table shows STORY-D as "not reached at tier live"

  Scenario: An item without a declared tier cannot enter a sprint
    Given CR-E has no proof_tier
    When cleargate sprint preflight runs for a sprint containing CR-E
    Then preflight fails with "CR-E: proof-declared"

  Scenario: Holdout scenarios stay hidden until the prove step
    Given STORY-F has proof_tier "container" and one Gherkin scenario tagged @holdout
    When QA-Red's context is prepared for STORY-F
    Then the @holdout scenario is absent from it
    And QA-Verify writes and runs a test for the @holdout scenario at the prove step


```

## Testing Strategy

- **What "working" means:** In a real sprint on a release carrying this epic (the dispenser_adapter pilot, Go, and this repository's next sprint), every goal and item shows a tier and an evidence pointer in the report, an item without evidence never reaches Done, and `make check` runs through the pre-gate scan in the Go repository.
- **Oracle:** the evidence files on disk, checked against git (each recorded sha is on the merged branch) and against the report's proof table; the owner opens three evidence files chosen at random and confirms they show a real run.
- **Known-positive case:** a container-tier story whose `make e2e` passes gets an evidence file and reaches Done.
- **Known-negative case:** a container-tier story whose command fails, or never runs, stays in Sprint Review and appears as "not proven" at close.
- **Baseline:** for dispenser_adapter SPRINT-01..04 and this repository's SPRINT-43..45: the share of items with any recorded proof (expected near 0), defects found after QA per shipped item (from the reports), and checks skipped by the pre-gate scan (dispenser: all 86 scans skipped typecheck).
- **Release gate:** unit and integration tests in cleargate-cli; a clean-room install that shows the seeded `proof` block (EPIC-058 rule 1, run by the agent with `cleargate verify-install`); then one pilot sprint in dispenser_adapter on the release candidate before publish, judged by the owner.
- **Regression guard:** node:test suites for `proof-declared`, `record_evidence.mjs`, the Done guard, the close step and the stack-neutral scan (a Go fixture with no package.json); the pilot report's proof table.

| Level | What it proves | Where the tests live | Who runs them, when |
|---|---|---|---|
| Unit | Predicate, recorder, Done guard, close listing, holdout filter behave on fixtures | `cleargate-cli/test/**/*.node.test.ts` | Developer and QA-Verify, every story |
| Contract | Evidence file schema and the `launch_wave` verdict field are stable for the Reporter and close | `cleargate-cli/test/scripts/*evidence*.node.test.ts` | QA-Verify, stories that touch them |
| Integration | `pre_gate_runner.sh` on a Go fixture repo; close_sprint over a fixture sprint with proven and unproven items | `cleargate-cli/test/**/*.integration.node.test.ts` | QA-Verify; consolidation pass |
| Real-host end-to-end | A real sprint run where tiers are declared, evidence is written and Done waits for it | dispenser_adapter pilot sprint on the RC; this repository's next sprint | Orchestrator runs the sprint; owner judges at the walkthrough |
| Eval | n/a — no model-judgement output is introduced; agents follow prompt rules that the real-host run checks | — | — |

### User journeys

| Journey | Actor | Path (trigger → steps → end) | Observable end state | Walked by |
|---|---|---|---|---|
| Plan with proof | Owner + orchestrator | Owner states the goal → plan names the goal's tier and each item's tier → preflight checks every item declares one | Sprint plan and items carry tiers; preflight passes only when all do | Pilot sprint planning in dispenser_adapter |
| Build to Done | Orchestrator + agents | QA-Red (holdouts hidden) → Developer → QA-Verify (+ holdouts) → prove step writes evidence → merge → Done | `evidence/<ID>.json` exists; state Done only after it | Pilot sprint execution |
| Human proof | Owner | Merged human-tier item waits in Sprint Review → walkthrough → owner confirms → recorded → Done | Evidence file holds the owner's words; item Done | Pilot sprint walkthrough |
| Close with a gap | Owner | close_sprint runs → lists "built, not proven at tier X" → owner acks | Report proof table shows the gap; goal verdict recorded | Pilot sprint close |

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** Tier names. Recommended: `unit` (the repo's own test runner, no outside services), `container` (real dependencies started for the run: a database, docker compose, an end-to-end make target), `live` (a live service, device or real host session the agents can reach), `human` (the owner's check is the evidence). Keep these four?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). The four tiers are `unit` (the repo's own test runner, no outside services), `container` (real dependencies started for the run: a database, docker compose, an end-to-end make target), `live` (a live service, device or real host session the agents can reach) and `human` (the owner's check is the evidence).
- **AI Question:** Where an item declares its proof. Recommended: frontmatter `proof_tier` plus a short `## Proof` section (command or steps, expected result, and a reason when the tier is human). This supersedes CR-128's "Real-host proof" count row, so CR-128 closes as absorbed. Agree?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). An item declares `proof_tier` in its frontmatter and a short `## Proof` section: the command or steps, the expected result, and a reason when the tier is `human`. CR-128 closes as absorbed.
- **AI Question:** When an item is Done. Recommended: a merged item waits in the existing `Sprint Review` state until its evidence exists; only then Done. Human-tier items reach Done at the walkthrough. The weaker alternative is Done at merge with evidence checked only at close, which is what CR-082 does today. Take the recommended?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). A merged item waits in the existing `Sprint Review` state until its evidence exists, and only then becomes Done. A human-tier item becomes Done at the walkthrough.
- **AI Question:** Who runs a command-tier proof. Recommended: the script (`record_evidence.mjs`), not an agent, in the prove step after QA-Verify. Agents are used only for holdout tests and browser checks. Agree?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). The script (`record_evidence.mjs`) runs a command-tier proof in the prove step after QA-Verify. Agents are used only for holdout tests and browser checks.
- **AI Question:** Holdouts. Recommended: the drafter tags at least one Gherkin scenario `@holdout` on every container or live item; QA-Red and the Developer never see it; QA-Verify writes and runs it at the prove step. None for unit or human items. Agree, including the minimum of one?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). Every container or live item tags at least one Gherkin scenario `@holdout`. QA-Red and the Developer never see it; QA-Verify writes and runs its test at the prove step. Unit and human items have none.
- **AI Question:** The existing backlog. Recommended: `proof-declared` applies only to items created after this release, so about 120 CRs and 106 bugs do not turn red; preflight requires a tier on every item that enters a sprint, old or new. Agree?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). `proof-declared` applies only to items created after this release, so the existing CRs and bugs do not turn red. Preflight requires a tier on every item that enters a sprint, old or new.
- **AI Question:** CR-129 reverses the OD-4 rule ("the goal verdict is spoken in the Brief, never written into the report"). Recommended: absorb CR-129 and record `goal_verdict` in the report frontmatter, because a tier on the goal is only useful if its outcome is recorded. Reverse OD-4?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). CR-129 is absorbed and OD-4 is reversed: the report records `goal_verdict` (and its basis) in its frontmatter.
- **AI Question:** INITIATIVE-002 lists EPIC-056 (CI verification layer) as a dependency for environment independence. Recommended: do not block on it; the container tier runs the target's own command (`make e2e`, a compose target) from `gate-checks.json`, and EPIC-056 stays separate. Agree?
- **Human Answer:** As recommended (owner, 2026-11-16: "happy with recommendations"). Not a dependency. The container tier runs the target's own command (`make e2e`, a compose target) from `gate-checks.json`; EPIC-056 stays separate.
- **AI Question:** The two field-trial fixes (the pre-gate scan runs configured commands on any stack; the kickoff baseline) ride in this epic because proof needs tests that actually run. Keep them here rather than in the later per-stack workstream (WS-6)?
- **Human Answer:** Neither: moved to EPIC-066, which ships first in SPRINT-46 (owner approved EPIC-066's sprint plan, 2026-11-14).
- **AI Question:** Size. A first cut gives eight stories: tier declaration and predicate; evidence recorder and config; Done guard; prove step in the loop; holdouts and the red-test rule; close and report; stack-neutral pre-gate scan; kickoff baseline. Run it as one sprint (recommended; SPRINT-45 ran six, dispenser runs fifteen), or split the prove step and holdouts into a second sprint?
- **Human Answer:** One sprint, SPRINT-47, after EPIC-066; six stories now that the last two moved to EPIC-066 (owner approved EPIC-066's sprint plan, 2026-11-14). The prove step is added as a stage in EPIC-066's `stagesFor` table.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
- [x] Testing Strategy answers how we test this, including its user journeys and real-host proof or why it isn't needed.
