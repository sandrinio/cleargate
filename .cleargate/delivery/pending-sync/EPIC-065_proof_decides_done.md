---
epic_id: EPIC-065
parent_ref: INITIATIVE-002
parent_cleargate_id: INITIATIVE-002
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
ambiguity: 🔴 High
area: sprint-execution,templates,gates,agent-prompts,scripts
context_source: INITIATIVE-002 workstream WS-1 and the owner's nine decisions of 2026-11-14; the SPRINT-45 release-candidate field trial in dispenser_adapter (.cleargate/field-trials/2026-11-dispenser-sprint45-rc.md, findings W-D1 and W010-3); canonical cleargate-cli main at f846d9a, surfaces mapped 2026-11-14
owner: sandrinio
target_date: null
created_at: 2026-11-14T19:04:01.387Z
updated_at: 2026-11-14T19:04:01.387Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: interrogation-resolved
      detail: 11 occurrences at §12
  last_gate_check: 2026-11-14T19:10:43Z
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
last_contradict_sha: "6cf4b7f1365529740a7d5fcebbef5735f4403ecdab53373d049827c42a468beb"
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
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs" action="modify" />
    <file path="cleargate-cli/src/lib/readiness-predicates.ts" action="modify" />
    <file path="cleargate-cli/src/init/detect-test-stack.ts" action="modify" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/codex/.codex/agents/devops.toml" action="modify" />
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

> Mapped 2026-11-14 against canonical `cleargate-cli` main (f846d9a).


- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md:15-19` — Goal Acceptance Check (CR-110): a command, artifact or observable state, or `not-mechanically-verifiable` plus qualitative evidence. No tier.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:217-233` (§A.5 records the check) and `:728-757` (§E.2: the verdict reads the check; OD-4 keeps it chat-only).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:149,158-165` — `PASS-PENDING-SMOKE` for a story's `deferred_verification` entry (CR-082); `cleargate-cli/scaffold/core/.cleargate/templates/story.md:84` declares it; `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1037-1233` (Step 2.9) blocks close unless `deferred-verify/<ID>.json` is green. Nothing writes that file today, and DevOps sets Done regardless.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/epic.md:177-205` — epic Testing Strategy with a "Real-host end-to-end" level and journeys (CR-126; predicate `testing-strategy-complete`, `cleargate-cli/src/lib/readiness-predicates.ts` ~1586-1700). Epic-only and free text.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` ~1277-1336 `evalTestLayersDeclared` and `cleargate-cli/scaffold/core/.cleargate/templates/story.md:209-215`, `cleargate-cli/scaffold/core/.cleargate/templates/CR.md:154-160`, `cleargate-cli/scaffold/core/.cleargate/templates/Bug.md:142-148` — Unit / Integration / E2E counts (CR-111). No tier.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:35-61` — states and transitions; `Sprint Review → Done` exists and the skill never uses `Sprint Review`. `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs` writes Done with no evidence precondition (`cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md:59,165-172`).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:26-72` — verdict fields `storyId, runId, devSha, qaSha`; no evidence field; no stage names.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_runner.sh:81-82,186-187,207-208,223-224` — every command step guarded by `-f package.json`; skip logged as INFO; test output sent to `/dev/null`. `read_config_field` in `cleargate-cli/scaffold/core/.cleargate/scripts/pre_gate_common.sh:12-22`.
- **Surface:** `cleargate-cli/src/init/detect-test-stack.ts` — seeds `gate-checks.json` from the detected stack (BUG-133 kept owner edits on upgrade).
- **Surface:** `cleargate-cli/scripts/clean-room/` and `cleargate-cli/src/commands/verify-install.ts` — clean-room install drivers and evidence (STORY-058-08/09), the strongest existing real-run precedent.
- **Coverage of this epic's scope:** partial, about 40%. The goal check, the deferred-verify close step, the unused `Sprint Review` state and the clean-room drivers carry the shape; the tier field, the recorder, the Done guard, holdouts and the stack-neutral runner are new.

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
- `cleargate-cli/scaffold/core/.cleargate/templates/story.md`, `CR.md`, `Bug.md` — `proof_tier` frontmatter; `## Proof` section (tier, command or steps, expected result, reason when the tier is human because agents cannot reach it); `@holdout` guidance in the Gherkin section.
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md` — Goal Acceptance Check gains `Tier:`.
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md` — per-item proof table; `goal_verdict` and `goal_verdict_basis` frontmatter (CR-129).
- `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`, `cleargate-cli/src/lib/readiness-predicates.ts` — new predicate `proof-declared` (story, CR, bug at ready-for-execution), with a created_at cut-over.
- `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md` — Done means evidence for the declared tier exists.
- `cleargate-cli/scaffold/core/.cleargate/scripts/record_evidence.mjs` (new) — `record_evidence.mjs <ID> [--tier T] [-- <command>]` or `--human "<what the owner checked>"`; writes `evidence/<ID>.json`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs` — guard on `Sprint Review → Done`.
- `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs` — Step 2.9 becomes the evidence step for every item; lists "built, not proven at tier X".
- `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` — evidence section in the Reporter's bundle.
- `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs` — a QA-Red view of the item without `@holdout` scenarios.
- `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs` — verdict field `evidence` (path or `pending:<tier>`), validated.
- `cleargate-cli/src/init/detect-test-stack.ts` — seed `gate-checks.json` `proof.unit` and `proof.container` from the stack.
- `cleargate-cli/src/commands/sprint.ts` — preflight: every item declares a tier. (The kickoff baseline is built by EPIC-066.)
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`, `devops.md`, `reporter.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` and the Codex `qa.toml`, `devops.toml`, `reporter.toml` — prove step, holdouts, property-not-shape rule, Done timing, OD-4 amended.

**Data Changes:**
- Work-item frontmatter: `proof_tier: unit | container | live | human` (stories, CRs, bugs).
- `gate-checks.json`: `proof: { unit, container, browser? }`.
- New files per sprint: `evidence/<ID>.json`. `deferred-verify/` is read for one release, then retired.
- `state.json`: optional per-story `evidence` pointer (additionalProperties already allowed; no new state).

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
- **Human Answer:** Unresolved
- **AI Question:** Where an item declares its proof. Recommended: frontmatter `proof_tier` plus a short `## Proof` section (command or steps, expected result, and a reason when the tier is human). This supersedes CR-128's "Real-host proof" count row, so CR-128 closes as absorbed. Agree?
- **Human Answer:** Unresolved
- **AI Question:** When an item is Done. Recommended: a merged item waits in the existing `Sprint Review` state until its evidence exists; only then Done. Human-tier items reach Done at the walkthrough. The weaker alternative is Done at merge with evidence checked only at close, which is what CR-082 does today. Take the recommended?
- **Human Answer:** Unresolved
- **AI Question:** Who runs a command-tier proof. Recommended: the script (`record_evidence.mjs`), not an agent, in the prove step after QA-Verify. Agents are used only for holdout tests and browser checks. Agree?
- **Human Answer:** Unresolved
- **AI Question:** Holdouts. Recommended: the drafter tags at least one Gherkin scenario `@holdout` on every container or live item; QA-Red and the Developer never see it; QA-Verify writes and runs it at the prove step. None for unit or human items. Agree, including the minimum of one?
- **Human Answer:** Unresolved
- **AI Question:** The existing backlog. Recommended: `proof-declared` applies only to items created after this release, so about 120 CRs and 106 bugs do not turn red; preflight requires a tier on every item that enters a sprint, old or new. Agree?
- **Human Answer:** Unresolved
- **AI Question:** CR-129 reverses the OD-4 rule ("the goal verdict is spoken in the Brief, never written into the report"). Recommended: absorb CR-129 and record `goal_verdict` in the report frontmatter, because a tier on the goal is only useful if its outcome is recorded. Reverse OD-4?
- **Human Answer:** Unresolved
- **AI Question:** INITIATIVE-002 lists EPIC-056 (CI verification layer) as a dependency for environment independence. Recommended: do not block on it; the container tier runs the target's own command (`make e2e`, a compose target) from `gate-checks.json`, and EPIC-056 stays separate. Agree?
- **Human Answer:** Unresolved
- **AI Question:** The two field-trial fixes (the pre-gate scan runs configured commands on any stack; the kickoff baseline) ride in this epic because proof needs tests that actually run. Keep them here rather than in the later per-stack workstream (WS-6)?
- **Human Answer:** Neither: moved to EPIC-066, which ships first in SPRINT-46 (owner approved EPIC-066's sprint plan, 2026-11-14).
- **AI Question:** Size. A first cut gives eight stories: tier declaration and predicate; evidence recorder and config; Done guard; prove step in the loop; holdouts and the red-test rule; close and report; stack-neutral pre-gate scan; kickoff baseline. Run it as one sprint (recommended; SPRINT-45 ran six, dispenser runs fifteen), or split the prove step and holdouts into a second sprint?
- **Human Answer:** One sprint, SPRINT-47, after EPIC-066; six stories now that the last two moved to EPIC-066 (owner approved EPIC-066's sprint plan, 2026-11-14). The prove step is added as a stage in EPIC-066's `stagesFor` table.

> The literal token `Unresolved` above is load-bearing: the `interrogation-resolved` readiness
> criterion checks that the body does NOT contain it. Leave it in place while the question is open
> and the epic cannot pass its gate; remove it only by writing the actual answer. Do not delete the
> token while leaving the question unanswered — that defeats the criterion.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.
- [x] Testing Strategy answers how we test this, including its user journeys and real-host proof or why it isn't needed.
