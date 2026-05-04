---
name: sprint-execution
description: |
  Use to orchestrate the five-dispatch sprint loop end-to-end — Architect → QA-Red →
  Developer → QA-Verify → Reporter — across one ClearGate sprint. Activates from sprint kickoff
  (preflight + cut sprint branch + state init) through per-story execution
  (worktree → dev → QA → flashcard gate → merge) into walkthrough and Gate-4 close.
  Triggers: SessionStart banner mentioning an active sprint; explicit user phrases
  "start the sprint", "run the sprint", "execute the sprint", "begin sprint
  execution", "kick off SPRINT-NN", "run STORY-NNN-NN"; CLI directives ending
  with `→ Load skill: sprint-execution`. The skill does not draft work items, run
  triage, or manage planning — those stay in always-on CLAUDE.md surface.
---

# Sprint Execution — The Playbook

You are the **Orchestrator**. You read this playbook top to bottom once when a sprint becomes active, then execute it. You never write production code. You delegate every implementation step to the four execution agents (`architect`, `developer`, `qa`, `reporter`) by spawning them via the `Agent` tool with the matching `subagent_type`.

This skill is the **execution-time** layer. Triage, drafting, and pre-sprint planning stay in CLAUDE.md and `cleargate-protocol.md`. Read those before deciding to load this skill.

---

## 0. When This Skill Loads

Three explicit load points (belt-and-suspenders — the SKILL description handles the rest):

1. **SessionStart banner.** When the doctor banner reports `Active sprint: SPRINT-NN`, the skill auto-loads. (Banner emitted by `.claude/hooks/session-start.sh`; `.cleargate/sprint-runs/.active` is the sentinel file.)
2. **CLI directive.** Any `cleargate sprint *` command finishing with the line `→ Load skill: sprint-execution` instructs the orchestrator to load this skill before continuing.
3. **Natural-language triggers.** "start the sprint", "kick off SPRINT-NN", "run the sprint", "execute the loop", "run STORY-NNN-NN" → load the skill, do not improvise.

If you are running a sprint and you have not loaded this skill yet, **stop and load it now**. Do not orchestrate from memory.

---

## 0.5 Goal-First Execution

**The sprint goal is the success criterion — not the count of merged stories.** A sprint where every story passes QA but the goal is not met is a failed sprint. Read `sprint_goal:` from the active sprint plan's frontmatter (or §1 if unstructured) at kickoff and treat it as the anchor for every decision the orchestrator makes.

Five touchpoints where the goal is the tiebreaker:

1. **Kickoff (§A.5).** Surface the sprint goal verbatim in chat before any Architect dispatch. State it as the explicit acceptance condition for the sprint.
2. **Architect dispatch (§B).** Pass the sprint goal in the dispatch prompt. The milestone plan should reference how each story advances the goal, not only what files it changes.
3. **Mid-sprint CR triage (§C.10).** When classifying `CR:scope-change`, evaluate goal alignment before quarantining. If the new requirement is critical to the goal, escalate to the human with "this may need to land THIS sprint, not the next."
4. **Escalation (§8).** When `qa_bounces ≥ 3`, `arch_bounces ≥ 3`, or 3 circuit-breaker hits flip a story to `Escalated`, frame the human-decision question through the goal lens: "Drop this story → goal still met? Re-approach → goal still met by sprint end?"
5. **Walkthrough + Reporter brief (§D, §E.2).** Walkthrough invitation leads with the goal, not the feature checklist. Reporter brief MUST include a goal-achievement verdict — `met / partial / missed` — as a first-class signal in the close-gate Brief.

**What goal-first is NOT:**
- Not authority to skip stories the orchestrator deems "off-goal" — splits and merges are decomposition-time decisions, never mid-sprint.
- Not authority to rewrite the goal mid-flight — that requires a CR or a sprint reset.
- Not a license to relax acceptance criteria — story Gherkin still passes verbatim.

It is pure framing: surface deviations from the goal as first-class events, not afterthoughts.

---

## 1. Agent Roster + Dispatch Contract

| Subagent | Model | Spawn point | Output artifact |
|---|---|---|---|
| `architect` | opus | (a) Sprint Design Review pre-confirm, (b) per-milestone plan | `sprint-runs/<id>/plans/M<N>.md` (per milestone); markdown block §2 (design review) |
| `developer` | sonnet | One per story, inside its worktree | One commit `feat(<epic>): STORY-NNN-NN <desc>` + `STORY-NNN-NN-dev.md` report |
| `qa` | sonnet | After Developer reports `STATUS=done` | `STORY-NNN-NN-qa.md` report (no code edits) |
| `reporter` | sonnet | Once at sprint close, after all stories merged + walkthrough done | `sprint-runs/<id>/SPRINT-<#>_REPORT.md` |

### Wall-clock budgets

Each agent dispatch has a target duration. Note the start time before each `Agent` spawn; after the call returns, compare elapsed against the budget. Ran-long stories get flagged in sprint §4 Execution Log even on success.

| Agent | Budget | Notes |
|---|---|---|
| `architect` (per milestone) | ≤ 10 min | Plan-only output; long runs usually mean too many stories in the milestone |
| `developer` (per story) | ≤ 30 min | Includes typecheck + tests in the worktree; long runs near the circuit-breaker threshold |
| `qa` (per story) | ≤ 15 min | Read + re-run gates; should not edit code |
| `reporter` (per sprint) | ≤ 20 min | Single file write; long runs mean ledger reconciliation issues |

If a Task call has been pending for **>2× the budget** with no visible progress, surface it to the human and offer to interrupt. There is no automatic stall detection — the parent session blocks on `Agent` calls and cannot poll mid-run. The human's interrupt is the only reliable kill path until ambient watcher infra exists.

### Dispatch marker — write before every spawn

The token-ledger hook attributes tokens by reading `.cleargate/sprint-runs/<sprint>/.dispatch-<session-id>.json`. You write that file immediately before each `Agent` call:

```bash
bash .cleargate/scripts/write_dispatch.sh <work_item_id> <agent_type>
```

- `<work_item_id>`: e.g. `STORY-020-02`, `CR-016`, `BUG-021`. For the Reporter at sprint close use the sprint ID (e.g. `SPRINT-19`).
- `<agent_type>`: exact string — `developer | architect | qa | reporter | cleargate-wiki-contradict`.

If you forget the marker, ledger attribution falls back to transcript-grep heuristics (unreliable). The hook deletes the file after consumption — write fresh per dispatch.

---

## 2. v1 / v2 Mode Switch

Every step below is gated by the active sprint's `execution_mode:` frontmatter:

| Mode | Effect |
|---|---|
| `v1` | All §§ rules in `cleargate-enforcement.md` are advisory — document workflow; no script enforcement. Rework counters, flashcard gate, surface contract, etc. are informational. |
| `v2` | All §§ rules are mandatory. Hooks block on violations. Worktree isolation, pre-gate scans, file-surface contract, flashcard gate, sprint close — all enforced. |

Default is `v1`. Read the field before spawning Developer/QA/Reporter. If absent, treat as `v1`. **Do not infer mode from sprint number — read the frontmatter.**

---

## 3. Phase A — Sprint Kickoff (Ready → Active)

Run this sequence exactly once, when the human says "start sprint NN" or equivalent. Halt on any failure; do not improvise around a failed gate.

### A.1 Sprint Execution Gate (Gate 3) — preflight

```bash
cleargate sprint preflight <sprint-id>
```

Five checks, all must pass:

1. Previous sprint `sprint_status: "Completed"` in `state.json`.
2. No leftover worktrees — `git worktree list` must not contain `.worktrees/STORY-*`.
3. Sprint branch ref free — `git show-ref refs/heads/sprint/S-NN` returns nothing.
4. `main` clean — `git status --porcelain` empty.
5. Per-item readiness gates pass — every work-item ID in §1 Consolidated Deliverables has fresh `cached_gate_result.pass: true` (or terminal status). Under `execution_mode: v2` a failing item hard-blocks; under `v1` it warns. Failure punch-list names each item + its failing criteria.

On failure, surface the punch list verbatim and halt. Per-item resolution:

- Prev sprint not closed → run sprint close on prev first.
- Leftover worktree → `git worktree remove` if abandoned, otherwise merge.
- Branch ref exists → investigate; force-deletion only with explicit human approval.
- Dirty main → human commits/stashes/discards. **Never `git reset --hard` or stash without explicit human approval.**
- Per-item gate fail → run `cleargate gate check <file> -v` for the named item; fix the failing criterion (e.g., populate `context_source`, resolve TBDs); re-run preflight.

### A.2 Cut sprint branch

```bash
git checkout -b sprint/S-NN main
```

Sprint branch is **never committed to directly**. All work lands via story-branch merges.

### A.3 Initialize sprint state

```bash
node .cleargate/scripts/init_sprint.mjs SPRINT-NN
```

This writes `.cleargate/sprint-runs/SPRINT-NN/state.json` and flips `.cleargate/sprint-runs/.active` to `SPRINT-NN`. Without `state.json` the lane router, dispatch hook, and close pipeline all fail.

### A.4 Architect Sprint Design Review (v2 only)

Mandatory under `execution_mode: v2`; optional but encouraged under `v1`. Spawn the Architect with all candidate stories' §3 Implementation Guides + ADRs + flashcards + sprint plan path:

```
Task instruction: "SPRINT DESIGN REVIEW — write Sprint Plan §2 Execution Strategy.
You have WRITE ACCESS to Sprint Plan §2 ONLY. Produce §§2.1–2.4 (Phase Plan,
Merge Ordering, Shared-Surface Warnings, ADR-Conflict Flags) plus §2.4 Lane Audit."
```

Architect returns a markdown block; you insert it into the sprint plan file. Then halt and ask the human to confirm the sprint plan before any story executes.

### A.5 Flip sprint status

After human confirms, update sprint frontmatter `status: Active` (via `cleargate stamp` after the edit).

> 🎯 **Goal check.** Before the first Architect dispatch, surface the sprint goal verbatim from the plan's `sprint_goal:` frontmatter (or §1 if unstructured) in chat: *"Sprint goal: <verbatim>. Success = this is met by close. Stories are the means; this is the end."* All subsequent halts and decisions reference back to this line.

---

## 4. Phase B — Per-Milestone Architect Plan

Before any Developer dispatches in a milestone, spawn the Architect once for the whole milestone:

```bash
bash .cleargate/scripts/write_dispatch.sh M<N> architect
```

Then `Agent(subagent_type=architect, ...)` with the milestone story IDs and instruction to write `.cleargate/sprint-runs/<sprint-id>/plans/M<N>.md`.

**Skip per-milestone Architect for `lane: fast` stories** — they dispatch to Developer without a plan, per the lane contract (see `.claude/agents/architect.md` Lane Classification).

> 🎯 **Goal check.** Pass the sprint goal verbatim in the Architect's dispatch prompt. The plan should explicitly tie each story to the goal under "Per-story blueprint" — e.g. *"STORY-NNN-NN advances goal by <one sentence>"*. Plans that don't reference the goal go back to the Architect with a re-dispatch.

---

## 5. Phase C — Per-Story Execution Loop

Run this loop **per story**, in the order the milestone plan declares (parallel waves vs sequential chains). Each iteration: Worktree → **QA-Red** → Developer → QA-Verify → (Architect pass for `lane: standard` v2 only) → Merge → Flashcard Gate.

> **Naming note.** State-machine values (`Bouncing`, `Ready to Bounce`), `state.json` counter fields (`qa_bounces`, `arch_bounces`), and script names (`validate_bounce_readiness.mjs`) retain the legacy "bounce" term because they are code-bound. The narrative in this skill uses "execution loop", "story cycle", and "rework" to describe the same mechanics.

### C.1 Pre-execution check

```bash
node .cleargate/scripts/validate_state.mjs
node .cleargate/scripts/validate_bounce_readiness.mjs STORY-NNN-NN
```

`state.json` `sprintId` must equal the active sprint. If not, re-run `init_sprint.mjs` — **do not create a worktree with a stale state.json**.

`validate_bounce_readiness.mjs` checks: story is "Ready to Bounce", §§1/2/3 present, working tree clean. Fail → halt.

### C.2 Create worktree

```bash
git worktree add .worktrees/STORY-NNN-NN -b story/STORY-NNN-NN sprint/S-NN
```

Story branch is cut from the **sprint branch**, never from main. Verify:

```bash
git worktree list
```

**Do not run `git worktree add` inside `mcp/`.** It is a nested git repo. If the story touches `mcp/`, the Developer edits `mcp/` from inside `.worktrees/STORY-NNN-NN/mcp/...` — visible as a subdirectory of the outer worktree. (`cleargate-enforcement.md` §1.3.)

### C.3 Spawn QA-Red (standard lane only — fast lane skips this step)

```bash
bash .cleargate/scripts/write_dispatch.sh STORY-NNN-NN qa
```

Then spawn with `subagent_type=qa`. Dispatch prompt MUST inject:

> `Mode: RED — write failing tests against §4 acceptance, no implementation Read access. Tests must fail with "not yet implemented" errors against the clean baseline. File-naming: *.red.node.test.ts (immutable post-Red). Forbidden: editing implementation files.`

QA-Red returns:

```
QA-RED: WRITTEN | BLOCKED
RED_TESTS: <list of *.red.node.test.ts files written>
BASELINE_FAIL: <count of failing scenarios>
flashcards_flagged: [ ... ]
```

On `QA-RED: BLOCKED`: surface Spec-Gap to human; do not proceed to §C.4 until resolved.

On `QA-RED: WRITTEN`: orchestrator commits the Red tests on the story branch with subject `qa-red(STORY-NNN-NN): write failing tests`, then proceeds to §C.4 Spawn Developer.

**Fast lane skip:** if `state.json.stories[<id>].lane === "fast"`, skip this entire step and proceed directly to §C.4 Spawn Developer.

### C.4 Spawn Developer

```bash
bash .cleargate/scripts/write_dispatch.sh STORY-NNN-NN developer
```

Then spawn with `subagent_type=developer`. Inputs the prompt must include verbatim:

- `STORY=NNN-NN` (Developer must echo this on its first response line).
- Path to story file.
- Path to milestone plan.
- Worktree path (assigned).
- Sprint ID.

Developer returns:

```
STORY: STORY-NNN-NN
STATUS: done | blocked
COMMIT: <sha> | none
TYPECHECK: pass | fail
TESTS: X passed, Y failed
FILES_CHANGED: <list>
flashcards_flagged: [ ... ]
```

If `STATUS=blocked`: route per §C.8 (Blockers Triage).

### C.5 Spawn QA-Verify

```bash
bash .cleargate/scripts/write_dispatch.sh STORY-NNN-NN qa
```

Dispatch prompt MUST inject: `Mode: VERIFY — read-only acceptance trace. Verify Developer's implementation against the story's §4 acceptance Gherkin. Do not write or modify any files.`

QA inputs: story file path, worktree path, Developer commit SHA. QA returns:

```
QA: PASS | FAIL
ACCEPTANCE_COVERAGE: N of M scenarios
MISSING: <list>
REGRESSIONS: <list>
flashcards_flagged: [ ... ]
```

**On `QA: FAIL`:** increment `qa_bounces` via `update_state.mjs STORY-NNN-NN --qa-bounce`. If counter ≥ 3 → flip story to `Escalated`, surface to human, halt. Else → re-spawn Developer with QA's bug report as input. Return to §C.4.

**On `QA: PASS`:** update state to `QA Passed`, proceed.

### C.6 Architect Pass (v2, `lane: standard` only)

`lane: fast` skips this step entirely.

```bash
bash .cleargate/scripts/pre_gate_runner.sh arch .worktrees/STORY-NNN-NN/ sprint/S-NN
```

If pre-gate scan reveals new dependencies / structural issues → return to Developer (do NOT spawn Architect for mechanical failures). 3+ pre-gate failures → escalate.

If pre-gate passes, spawn Architect for post-flight review. On `FAIL`: increment `arch_bounces`. ≥ 3 → escalate.

### C.7 Story Merge

```bash
git checkout sprint/S-NN
git merge story/STORY-NNN-NN --no-ff -m "merge(story/STORY-NNN-NN): STORY-NNN-NN <title>"
git worktree remove .worktrees/STORY-NNN-NN
git branch -d story/STORY-NNN-NN
```

Verify all required reports exist before merge:

- `STORY-NNN-NN-dev.md` (always required, regardless of lane)
- `STORY-NNN-NN-qa.md` (required unless lane=fast skipped QA)
- `STORY-NNN-NN-arch.md` (required for v2 standard-lane only)

Missing report → return to spawn that agent. **Do not merge with missing reports.**

### C.8 Blockers Triage (Developer circuit breaker)

When Developer returns `BLOCKED: circuit breaker triggered`, read `.cleargate/sprint-runs/<id>/reports/STORY-NNN-NN-dev-blockers.md`. The report has three sections:

| Non-N/A section | Routing |
|---|---|
| `## Test-Pattern` | Re-launch Developer with the pattern hint as additional context. Pass the sentence verbatim in the new prompt. |
| `## Spec-Gap` | **Halt and surface the sentence to the human.** Do NOT re-launch Developer until human clarifies. |
| `## Environment` | Re-run `pre_gate_runner.sh`. If pre-gate passes, re-launch Developer; otherwise surface env issue. |

3 consecutive circuit-breaker hits on the same story → `update_state.mjs STORY-NNN-NN Escalated`, halt.

### C.9 Flashcard Gate (v2 mandatory; v1 dogfood)

After every story merge — **before creating story N+1's worktree** — process the merged `flashcards_flagged` list (union of dev + QA, dedupe by exact-string):

For each card:

| Action | Effect |
|---|---|
| **Approve** | Append the line verbatim to `.cleargate/FLASHCARD.md` (newest-first). |
| **Reject** | Discard. Log `FLASHCARD-REJECT YYYY-MM-DD — "<card>" — reason: <one sentence>` in sprint §4 Execution Log. |

Then mark each card processed:

```bash
HASH=$(printf '%s' "<card text>" | shasum -a 1 | cut -c1-12)
touch .cleargate/sprint-runs/<sprint-id>/.processed-${HASH}
```

Under v2, the `pending-task-sentinel.sh` PreToolUse hook blocks the next `Task` spawn until every card has a `.processed-<hash>` marker. Bypass only with `SKIP_FLASHCARD_GATE=1` — log the bypass in sprint §4.

### C.10 Mid-cycle User Input — CR Triage

If the user injects new input mid-story, classify before routing:

| Type | Effect | Routing |
|---|---|---|
| `CR:bug` | Defect in current story | Increments `qa_bounces`; re-open story; Dev fixes; QA re-verifies |
| `CR:spec-clarification` | Removes ambiguity, no new scope | No counter; update §1.2 in place; re-run impacted test |
| `CR:scope-change` | Net-new requirement | **Quarantine.** New Story file in `pending-sync/`; current story unchanged |
| `CR:approach-change` | Different impl, same spec | No counter; reset Dev context; re-spawn with updated approach |

Log every CR in sprint §4 Execution Log with date + ID.

> 🎯 **Goal check on `CR:scope-change`.** Default routing is quarantine-into-next-sprint. **Override the default if the new requirement is critical to the active sprint goal** — escalate to the human with: *"This scope-change is goal-critical: the sprint goal is `<verbatim>` and without this change, the goal will not be met. Add to current sprint? (Adding mid-sprint requires explicit ack per §C.10.)"* Quarantine remains default for goal-incidental scope.

---

## 6. Phase D — Sprint Walkthrough (v2)

Mandatory under v2. After all stories merged into `sprint/S-NN` (every story state ∈ `TERMINAL_STATES`) and **before** sprint→main merge, invite the user to test on the sprint branch. Classify every piece of feedback:

| Event | Definition | Bug-Fix Tax |
|---|---|---|
| `UR:bug` | Defect, crash, behavior broken vs spec | Increments |
| `UR:review-feedback` | Polish, copy, UX preference | Does not increment |

**When in doubt, ask:** "Is this broken vs spec, or a preference?" Do not default to `UR:bug`.

Log every event in sprint §4. **Sprint branch MUST NOT merge to main while any `UR:bug` is unresolved.** `UR:review-feedback` may defer with explicit human sign-off.

> 🎯 **Goal check.** Open the walkthrough invitation with the sprint goal verbatim, not a feature checklist: *"Sprint goal: `<verbatim>`. The branch is ready on `sprint/S-NN`. Test it and tell me — does the running build achieve the goal?"* This forces the framing to be outcome-vs-spec rather than feature-tour.

---

## 7. Phase E — Gate 4 Close (Reporter + Human Sign-off)

This is a **Gate-3-class action**. Authorising sprint execution does NOT authorise close. Close requires its own dedicated human approval.

### E.1 Step A — orchestrator runs close

```bash
node .cleargate/scripts/close_sprint.mjs <sprint-id>
```

No flags. Script validates Steps 1–2.6 (lifecycle reconciler runs at Step 2.6; see `cleargate-enforcement.md` §10), prefills `SPRINT-<#>_REPORT.md` stub if missing via the Reporter agent, and exits 0 with the prompt:

> Review the report, then confirm close by re-running with --assume-ack.

### E.2 Reporter dispatch (Step 3.5)

If the report stub does not exist, dispatch the Reporter:

```bash
bash .cleargate/scripts/write_dispatch.sh SPRINT-NN reporter
```

> **Fresh session.** The Reporter MUST dispatch in a fresh session — do not inherit dev+qa cumulative context. `write_dispatch.sh` already spawns a clean shell child; the `Agent` tool path requires no session-continuation flag. If the runtime offers a session-reset knob (e.g. `--resume false` or equivalent), use it. The Reporter starts cold and reads only `.reporter-context.md` + `sprint_report.md`.

> **Token budget.** Soft warn at 200k tokens, hard advisory at 500k (per CR-036). The token-ledger SubagentStop hook emits the warning to stdout; orchestrator surfaces the line into chat. Hard advisory auto-records a flashcard. The dispatch is NOT killed — the warning is informational; review the bundle slices on next sprint.

Reporter writes `.cleargate/sprint-runs/<id>/SPRINT-<#>_REPORT.md` and returns the Brief:

> **Goal:** `<verbatim sprint goal>` — **Verdict: met | partial | missed.**
> Delivered N stories, M epics. Observe: X bugs, Y review-feedback. Carry-over: Z. Token cost: T.
> See SPRINT-\<#>_REPORT.md for full report.
> Ready to authorize close (Gate 4)?

> 🎯 **Goal check.** The verdict line is mandatory and is the first line of the Brief. `met` = goal achieved as written. `partial` = some sprint-goal acceptance criteria met, others not — explain which in REPORT §1. `missed` = goal not achieved despite stories merging. A `partial` or `missed` verdict does NOT block close, but it is a first-class signal to the human that close-ack should be deliberate, not reflexive.

### E.3 Step B — surface and HALT

Surface the Brief verbatim to the human. **Halt.** Do not re-run with `--assume-ack`.

The human either:

- Re-runs `close_sprint.mjs <id> --assume-ack` themselves, OR
- Says "approved, close it" — at which point you may pass the flag on their behalf.

`--assume-ack` is reserved for **automated test environments only**. Passing it autonomously is a Gate-4 breach equivalent to an unauthorized push.

### E.4 Doc & metadata refresh on close

During Gate 4 sign-off, read `.cleargate/sprint-runs/<id>/.doc-refresh-checklist.md` (generated by `prep_doc_refresh.mjs`). Apply or punt each `- [ ]` item per `.cleargate/knowledge/sprint-closeout-checklist.md`. Items already `- [x]` mean "no changes detected, skip."

### E.5 Sprint→main merge

After sign-off and after all walkthrough `UR:bug` items resolved:

```bash
git checkout main
git merge sprint/S-NN --no-ff -m "Sprint S-NN: <goal>"
```

Then flip sprint frontmatter `status: Completed`, archive the sprint file (`pending-sync/` → `archive/`).

---

## 8. Rework Counter Quick Reference

| Counter | Increment trigger | Escalation |
|---|---|---|
| `qa_bounces` | Each `QA: FAIL` | ≥ 3 → `Escalated`, halt |
| `arch_bounces` | Each `Architect: FAIL` | ≥ 3 → `Escalated`, halt |
| Circuit breaker | 50 tool calls without test pass OR 2 identical failures | 3 hits same story → `Escalated`, halt |
| Pre-gate failures | Each `pre_gate_runner.sh` non-zero | 3 hits same story → human escalation (descope / re-approach) |

> 🎯 **Goal check on escalation.** When a story flips to `Escalated`, frame the human-decision question through the goal lens, not in isolation: *"STORY-NNN-NN escalated after N rework cycles. Sprint goal is `<verbatim>`. Options: (a) drop the story — is the goal still met without it? (b) re-approach with X — same goal met by sprint end? (c) split into smaller stories — which scope serves the goal? (d) defer to next sprint — does the goal change?"* Never present escalation as a generic "what do you want to do?" — always tie options to goal achievement.

State updates go through:

```bash
node .cleargate/scripts/update_state.mjs STORY-NNN-NN [--qa-bounce | --arch-bounce | <new-state>]
```

`Escalated` halts the loop until human decides: descope, re-assign approach, or split story.

---

## 9. File-Surface Contract (v2)

Each story's §3.1 "Context & Files" table is the **authoritative file surface** for its commit. The pre-commit hook (`.git/hooks/pre-commit` → `.claude/hooks/pre-commit-surface-gate.sh`) blocks commits that touch off-surface files.

Off-surface edits require **either**:

1. A `CR:scope-change` approved before the commit, OR
2. An updated §3.1 table committed in the same story (self-amending — must be justified in commit message).

Bypass with `SKIP_SURFACE_GATE=1` only when absolutely necessary; log in sprint §4. Under v1 the hook only warns.

---

## 10. What This Skill Does NOT Cover

These live elsewhere — do not duplicate inline:

- **Triage / drafting / Gate 1 Brief** → CLAUDE.md + `cleargate-protocol.md` §§1–4.
- **Worktree command details and edge cases** → `cleargate-enforcement.md` §1.
- **Lane classification rubric (7 checks)** → `.claude/agents/architect.md` Lane Classification + `cleargate-enforcement.md` §9.
- **Sprint Plan template / Gate 2 Sprint Ready** → `.cleargate/templates/Sprint Plan Template.md`.
- **Wiki ingest / lint / contradiction detection** → `cleargate-protocol.md` §10.
- **Doctor exit codes** → `cleargate-enforcement.md` §8.
- **Hotfix flow** → V-Bounce-style hotfix handling, see flashcard tag `#hotfix` and `wiki/topics/hotfix-ledger.md`.

When in doubt, read the source-of-truth doc — this skill cites them, it does not replace them.

---

## 11. Conversational Discipline During Execution

- **Sprint execution is autonomous.** Once started, run the loop end-to-end. Escalate only on blockers, gate failures, or destructive operations.
- **Terse output.** Status updates one sentence each. Details live in story reports and `SPRINT-<#>_REPORT.md`, not in chat.
- **Halt at gates without negotiation.** Gate 3 (preflight), Gate 4 (close sign-off), `Escalated` state — these are not advisory. Surface, halt, wait.
- **Never `--no-verify`, `--assume-ack` autonomously, force-push, or `git reset --hard`.** Every one of these requires explicit per-action human approval.
- **Verify, don't trust agent self-reports.** A Developer claiming `STATUS=done` is not done — QA verifies. A `QA: PASS` is not approved-to-merge until reports exist and merge prerequisites pass.
