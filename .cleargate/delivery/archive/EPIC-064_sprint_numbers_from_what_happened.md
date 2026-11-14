---
epic_id: EPIC-064
parent_ref: INITIATIVE-002
parent_cleargate_id: INITIATIVE-002
sprint_cleargate_id: SPRINT-45
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-14T00:00:00Z
ambiguity: 🟢 Low
context_source: "INITIATIVE-002 WS-4, owner decisions 2026-11-14 (all nine accepted); verified on disk 2026-11-14: workflow-run agents write <session>/subagents/workflows/<run>/agent-*.jsonl + .meta.json carrying agentType, workflowPhase and a description naming item and round"
area: measurement,sprint-execution,reporting,instrumentation
owner: sandrinio
target_date: 2026-11-21
created_at: 2026-11-13T22:54:20.097Z
updated_at: 2026-11-13T22:54:20.097Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T22:57:00Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-064
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T22:56:35Z
  sessions: []
last_contradict_sha: "bec43140215186b4f361e25a5fdc354166333018d5cfe3957180f3acc3c9328c"
---

# EPIC-064: Sprint Numbers From What Happened

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Derive per-item dispatches, rework rounds, wall time and tokens from the host's own subagent transcripts and from git, and make the sprint report read those numbers instead of hand-maintained counters.</objective>
  <architecture_rules>
    <rule>Read-only derivation. Never write events.jsonl, never add an event kind, never edit state-events.mjs: fold() moves updated_at before its kind switch, so an unknown kind breaks every later update_state.mjs call (CR-120 §3).</rule>
    <rule>state.json qa_bounces/arch_bounces are left as they are. The report shows derived numbers and names the counter only where the two disagree.</rule>
    <rule>Never fail a close. A missing transcript directory, a missing repo or an unparseable row is a warning plus exit 0 and a visible "not measured" line, never a throw.</rule>
    <rule>Canonical edits only: cleargate-cli/scaffold/core/.cleargate/** and cleargate-cli/scaffold/hosts/claude/.claude/**. The live copies in the meta-repo change only at the Gate-4 re-sync.</rule>
    <rule>No new runtime dependency. Node built-ins only; tests are *.node.test.ts under node:test in cleargate-cli/test/.</rule>
    <rule>Existing CLI shapes stay: count_tokens.mjs and prep_reporter_context.mjs keep their positional &lt;sprint-id&gt; with no required flags (close_sprint.mjs Step 3.5 calls them).</rule>
    <rule>close_sprint.mjs requiredMetricRows (Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches, LD events) must still be present in the report template.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/subagent-ledger.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs" action="create" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/count_tokens.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/lib/ledger-digest.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/config.example.yml" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs" action="modify" />
    <file path="cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/hooks/token-ledger.sh" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md" action="modify" />
    <file path="cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Nobody can tell whether a change to the loop helps, because the loop's own numbers are wrong. dispenser_adapter's STORY-003-01 shows it: git holds `qa-red(STORY-003-01): correct test defects (fix 1)` and a `(rework)` commit, while its event log and `state.json` record zero bounces. Per-agent cost is unusable for the same reason: `token-ledger.sh` slices the orchestrator's transcript, so every row is the orchestrator's window. Across about 150 field sprint reports, Reporters refused or flagged the token table in most sprints and rebuilt rework from git by hand.

The data needed already exists. Claude Code writes one transcript per subagent, including every agent a workflow run spawns, under `<session>/subagents/workflows/<run>/`. Each comes with a metadata file naming the agent type, the workflow phase and a description that names the item and round (for example `003-01 QA-Red fix 1`, `003-01 developer c1`). This epic reads it.

**What we build:** a per-dispatch ledger from those transcripts (CR-120, amended), a per-item metrics derivation that joins it with git, and a sprint report that uses the derived numbers.

**Success Metrics (North Star):**
- **Rework matches reality.** On the evidence set (SPRINT-44 here; dispenser_adapter SPRINT-01, SPRINT-02 and SPRINT-03 to date), the derived sprint-total rework rounds agree with the holdout hand recount's judged rework within 10%, and no single item is off by more than one round.
- **Cost is attributed.** At least 95% of subagent tokens in the evidence set are attributed to a roster item or explicitly labelled sprint-level (planning, design review, close).
- **The report uses it.** SPRINT-45's own report carries the derived per-item table, produced by running the canonical scripts against SPRINT-45.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Per-dispatch rows from top-level and workflow-run subagent transcripts, deduplicated by `message.id` (CR-120, amended).
- [ ] Session discovery from the ledger's `transcript` paths, with a fallback scan of the project's transcript directory bounded by the sprint window.
- [ ] Item matching that accepts full IDs and the short forms dispatches already use (`003-01` → `STORY-003-01`), against the sprint roster.
- [ ] Per-item derivation: dispatches by role and phase, rework rounds by cause, wall time, tokens; sprint totals; unattributed share (STORY-064-01).
- [ ] Git classification of commits that name an item, across the project repo and any configured code repos (STORY-064-01).
- [ ] Reporter bundle section and report template rows fed by the derivation; counters shown only where they disagree (STORY-064-02).

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- New event kinds or any write to `events.jsonl` or `state.json`. Mid-sprint admission events belong to INITIATIVE-002 WS-3 and need fold() support first.
- Transcripts of hosts other than Claude Code (Codex, Copilot). [[EPIC-058]] owns host adapters.
- Cross-sprint trend reporting (`sprint_trends.mjs` stays a stub).
- USD accuracy beyond the pricing-table fix in [[BUG-117]].
- The sprint dashboard. It keeps reading what it reads today.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | `sprint_metrics.mjs` wall time p100 < 10 s on dispenser_adapter SPRINT-03 (3 sessions, about 60 agent transcripts), measured by `time node … sprint_metrics.mjs SPRINT-03` in the release-gate run |
| Retention | Claude Code removes old transcripts after its cleanup period. A sprint whose transcripts are gone reports "not measured", never zero. |
| Privacy | The derived output carries counts, IDs, phases and timings only. No prompt or message text is copied out of a transcript. |

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/count_tokens.mjs:1-40` — sprint token digest CLI with a locked positional `<sprint-id>` and a `--json` shape consumed by `prep_reporter_context.mjs`.
- **Coverage of this epic's scope:** partial — right invocation point; reads only the misattributed ledger.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs:18-26` — builds the Reporter bundle (state.json summary with `qa_bounces`/`arch_bounces`, git log digest, token digest).
- **Coverage of this epic's scope:** partial — the bundle is where derived metrics land; today it passes counters through.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md:64-100` — §3 Execution Metrics, whose first-pass rate is defined from the counters.
- **Coverage of this epic's scope:** partial — rows are kept; their sources change.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/token-ledger.sh` — writes rows with `session_id` and `transcript`, the join key for session discovery.
- **Coverage of this epic's scope:** partial — supplies session paths; its token deltas stay labelled as the orchestrator window.

## Prior work

Wiki query run 2026-11-14 for INITIATIVE-002, measurement theme.

- [[CR-120]] — Draft. Subagent ledger design; absorbed and amended here (workflow-run transcripts, session discovery, scaffold paths).
- [[CR-106]] — Completed. Event log and fold(); this epic must not change it.
- [[BUG-068]], [[BUG-069]] — Completed. Dispatch-marker and fallback-attribution fixes; attribution is still orchestrator-window.
- [[BUG-117]] — Draft. Pricing table lacks Claude 5 models; runs in the same sprint.
- [[EPIC-013]] — Completed. Defined first-pass rate and the Correction Tax; derived numbers must keep those definitions.
- [[EPIC-044]] — Completed. Token efficiency work that had no per-dispatch measurement.
- No prior work found on bounce counters undercounting.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `count_tokens.mjs` plus the counters already in `state.json`.
- **Why isn't extension / parameterization / config sufficient?** The counters are written only when the orchestrator remembers to call `update_state.mjs`, and making it remember harder is what the field data shows failing. `count_tokens.mjs` reads a ledger whose rows measure the wrong window. Both sources are wrong at the point of capture, so no parameter fixes them. The smallest correct change is to read records the loop cannot forget to write: the host's per-agent transcripts and git. That is one new reader script, one derivation script, and source changes in the two consumers. No new event, hook or schema.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/subagent-ledger.mjs` (new) — walks `<session>/subagents/**` including `workflows/<run>/`, one row per dispatch (CR-120).
- `cleargate-cli/scaffold/core/.cleargate/scripts/count_tokens.mjs` — calls the ledger reader once (CR-120).
- `cleargate-cli/scaffold/core/.cleargate/scripts/lib/ledger-digest.mjs` — labels orchestrator-window columns (CR-120).
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/token-ledger.sh` — adds `"measures": "orchestrator-window"` to rows (CR-120).
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` — dispatch description format `<stage> <ITEM-ID>[ — note]` (CR-120).
- `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs` (new) — per-item derivation (STORY-064-01).
- `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` — new bundle section (STORY-064-02).
- `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md` — §3 rows fed by the derivation (STORY-064-02).
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md` — reads the derived section (STORY-064-02).

**Data Changes:**
- New sibling files in the sprint directory: `subagent-ledger.jsonl` (one row per dispatch) and `metrics.json` (per-item derivation). Both are rebuildable from transcripts and git; neither is a source of truth.
- No new config key. The git repos to classify are `["."]` plus the existing `wiki.brief.release_repos` list in `.cleargate/config.yml`, de-duplicated (STORY-064-01 R6). This meta-repo already lists `cleargate-cli` and `mcp` there.

## 5. Acceptance Criteria

```gherkin
Feature: Sprint numbers from what happened
  Scenario: A workflow-run rework round is counted
    Given a sprint whose session holds subagents/workflows/<run>/ transcripts
    And their metadata names "003-01 QA-Red r1" and "003-01 QA-Red fix 1"
    When sprint_metrics runs for that sprint
    Then STORY-003-01 shows 2 QA-Red dispatches and 1 red-test correction round

  Scenario: The report shows derived numbers and names a disagreeing counter
    Given state.json records qa_bounces 0 for an item whose derived rework is 2
    When the Reporter bundle is built
    Then the bundle shows rework 2 for that item and notes "state.json counter: 0"

  Scenario: Cost is attributed per dispatch, not per orchestrator window
    Given a sprint with Sonnet developer dispatches
    When sprint_metrics runs
    Then their tokens appear under developer with model claude-sonnet-*

  Scenario: Missing transcripts never fail a close
    Given a sprint whose transcript directory no longer exists
    When count_tokens.mjs and prep_reporter_context.mjs run
    Then both exit 0 and the bundle states "not measured: transcripts not found"
```

## Testing Strategy

- **What "working" means:** a Reporter, at close, writes rework and cost per item that match what git and the transcripts show, without recounting by hand.
- **Oracle:** a holdout hand recount of the evidence set, made before the sprint starts from git logs and sprint reports by a method that does not use the new scripts. Stored at `.cleargate/sprint-runs/SPRINT-45/holdout/recount.md`; builder dispatches are told not to read it.
- **Known-positive case:** dispenser_adapter STORY-003-01 — 1 red-test correction and 1 developer rework round in git.
- **Known-negative case:** dispenser_adapter BUG-001 — one QA-Red, one developer, one verify, one merge; rework 0.
- **Baseline:** the holdout recount above, plus today's counter values and the share of orchestrator-window rows, for the same sprints.
- **Release gate:** unit, contract and integration levels green in `cleargate-cli`; the real-host run below within the 10% target; the owner reads the comparison table at Gate 4.
- **Regression guard:** the integration fixture (a recorded `subagents/` tree with a workflow run, plus a fixture git repo) stays in `cleargate-cli/test/` and runs in the full suite.

| Level | What it proves | Where the tests live | Who runs them, when |
|---|---|---|---|
| Unit | Description parsing, roster matching, `message.id` dedupe, commit classification | `cleargate-cli/test/scripts/*.node.test.ts` | QA-Red writes, Developer runs, every build |
| Contract | `subagent-ledger.jsonl` row shape and `metrics.json` shape that STORY-064-01 and STORY-064-02 consume | same, `*.contract.node.test.ts` naming per sprint-context | QA-Red, frozen at the contract step |
| Integration | Fixture session tree + fixture git repo + state.json → expected metrics and bundle text | `cleargate-cli/test/scripts/` | QA-Verify, full suite at merge |
| Real-host end-to-end | The scripts on real SPRINT-44 and dispenser_adapter data, compared to the holdout recount | evidence file `sprint-runs/SPRINT-45/evidence/metrics-vs-recount.md` | Orchestrator at the Goal Acceptance Check; owner reads it at Gate 4 |
| Eval | n/a — no model behaviour is under test | — | — |

### User journeys

| Journey | Actor | Path (trigger → steps → end) | Observable end state | Walked by |
|---|---|---|---|---|
| Close a sprint with true numbers | Reporter agent | `close_sprint.mjs` → `prep_reporter_context.mjs` → bundle → report §3 | Report §3 per-item rework and cost match the holdout recount | Real-host run on SPRINT-45's own close |
| Measure a field sprint | Owner | `node sprint_metrics.mjs SPRINT-03` in dispenser_adapter | Per-item table printed; matches the recount | Real-host run on dispenser_adapter SPRINT-03 |

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** Should the derived rework replace the state.json counters in the report, or sit beside them?
- **Human Answer:** Beside, with the derived number leading and the counter named only where it disagrees. Recommended by the agent and covered by the owner's acceptance of INITIATIVE-002 §6 on 2026-11-14; confirm at this Brief.
- **AI Question:** Which sprints form the evidence set?
- **Human Answer:** SPRINT-44 here and dispenser_adapter SPRINT-01 to SPRINT-03. They are recent enough that their transcripts still exist, and Claude ran them, so no Codex dispatches are missing. doc_processor's recent sprints used Codex for production code and are left out.

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
