---
epic_id: EPIC-013
status: Completed
completed_at: 2026-04-21T08:30:00Z
ambiguity: 🟢 Low
approved: true
approved_at: 2026-04-21T00:00:00Z
approved_by: sandro
context_source: PROPOSAL-010_Execution_Phase_v2.md
owner: sandro
target_date: 2026-05-15
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T07:55:06Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-04-20T22:25:36.709Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 1
draft_tokens:
  input: 942
  output: 403148
  cache_creation: 2362836
  cache_read: 70099912
  model: claude-opus-4-7
  last_stamp: 2026-04-21T07:55:06Z
  sessions:
    - session: ededd9e9-caa1-4ce4-8e31-05880e2b5e85
      model: claude-opus-4-7
      input: 942
      output: 403148
      cache_read: 70099912
      cache_creation: 2362836
      ts: 2026-04-21T07:41:47Z
sprint_cleargate_id: "SPRINT-01"
---

# EPIC-013: Execution Phase v2 — Bounce Loop, Worktrees, Pre-Gates, Self-Improvement

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Harden ClearGate's execution phase by porting 8 mechanized patterns from V-Bounce Engine — git worktree per story, pre-gate scanner, independent bounce counters with machine-readable state, circuit-breaker blockers report, immediate flashcard gate, user walkthrough on sprint branch, mid-sprint triage, sprint-close self-improvement pipeline — while preserving ClearGate's three-repo split (delivery/wiki/mcp) and Karpathy wiki drift model.</objective>
  <architecture_rules>
    <rule>Do NOT replace the four-agent contract (architect/developer/qa/reporter). DevOps + Scribe are OUT OF SCOPE for v2; optional split stays future work.</rule>
    <rule>Do NOT touch MCP adapter, wiki ingest/lint, or scaffold manifest surfaces. This epic is execution-loop only.</rule>
    <rule>All new state lives under .cleargate/sprint-runs/&lt;id&gt;/ or .cleargate/delivery/pending-sync/; no changes to .cleargate/wiki/ writers.</rule>
    <rule>state.json is a cache of sprint markdown, not a new source of truth. Sprint markdown remains canonical for humans.</rule>
    <rule>All new scripts go through a run_script.sh wrapper (per V-Bounce pattern) — no direct shell invocation from agents.</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/agents/developer.md" action="modify" />
    <file path=".claude/agents/qa.md" action="modify" />
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".claude/agents/reporter.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path=".cleargate/templates/sprint_report.md" action="create" />
    <file path=".cleargate/scripts/run_script.sh" action="create" />
    <file path=".cleargate/scripts/pre_gate_runner.sh" action="create" />
    <file path=".cleargate/scripts/init_sprint.mjs" action="create" />
    <file path=".cleargate/scripts/update_state.mjs" action="create" />
    <file path=".cleargate/scripts/complete_story.mjs" action="create" />
    <file path=".cleargate/scripts/close_sprint.mjs" action="create" />
    <file path=".cleargate/scripts/prefill_report.mjs" action="create" />
    <file path=".cleargate/scripts/suggest_improvements.mjs" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Through SPRINT-01 → SPRINT-08 we learned our execution loop is under-mechanized. Developer commits straight to `main`, so we cannot parallelize stories safely; QA re-runs typecheck on every story even when a pre-scan would bounce trivial failures back cheaper; flashcards are batched at sprint end when context has decayed; post-sprint user feedback lands as hotfixes that inflate the (uncaptured) correction-tax signal; we have no cross-sprint trend metric and no mechanism for the framework to improve itself from its own friction logs. V-Bounce Engine — a sibling framework built on the same instinct — has solved each of these with concrete, reusable primitives we can port.

**Success Metrics (North Star):**
- Parallel story execution is safe: two Developer agents running on independent stories never contaminate each other's working tree. Demonstrated by a sprint containing ≥1 pair of parallel stories.
- Pre-gate scan bounces at least one mechanical failure per sprint before QA/Architect spawn (measured on first 3 post-adoption sprints).
- Flashcards recorded per sprint increases ≥30% vs SPRINT-08 baseline (4 cards), driven by the Step-5.5-equivalent gate.
- Sprint Report includes bounce counts, correction-tax %, first-pass success rate, and a framework self-assessment table with ≥1 actionable improvement per sprint.
- Zero cases where post-merge test failure reaches `main` undetected (post-merge validation runs on sprint branch before release).

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **Git worktree hierarchy per story** — cut `sprint/S-XX` from main at sprint start; each story executes inside `.worktrees/STORY-NNN-NN/` on its own branch; merge back to sprint branch after QA+Architect pass; sprint merges to main only after user walkthrough.
- [ ] **Pre-gate scanner** — `pre_gate_runner.sh qa|arch <worktree> <branch>` runs mechanical checks (typecheck, lint, debug statements, TODOs, new-dep detection) before spawning the agent; 3 mechanical failures in a row = escalate without spawning QA/Architect.
- [ ] **Machine-readable state + independent bounce counters** — `.cleargate/sprint-runs/<id>/state.json` tracks each story's state (Ready→Bouncing→QA-Passed→Arch-Passed→Sprint-Review→Done/Escalated/Parking-Lot) and separate `qa_bounces` / `arch_bounces` counters. Counter hitting 3 on either = escalation. state.json and sprint markdown updated via `update_state.mjs` script.
- [ ] **Circuit-breaker / Blockers Report** — Developer agent spec amended: after ~50 tool calls with no net progress, Developer writes `STORY-NNN-NN-dev-blockers.md` instead of an implementation report. Orchestrator triages as Test-pattern / Spec-gap / Environment and routes. 3 circuit-breaker hits = escalation.
- [ ] **Immediate Flashcard Gate (hard-gate between stories)** — after a story merges into the sprint branch and before the next story's worktree is created, any flashcards flagged in Dev/QA reports must be processed (recorded or rejected). The orchestrator cannot move on without this checkpoint.
- [ ] **User Walkthrough on sprint branch (pre-merge-to-main)** — after all stories merged into `sprint/S-XX` and before sprint→main, user tests running app. Feedback split into *Review Feedback* (enhancement, doesn't count against correction tax) and *Bug* (does count). Each logged in sprint markdown §4 with `UR` event type.
- [ ] **Mid-sprint change-request triage** — protocol addition: user input during a bounce is classified Bug / Spec-Clarification / Scope-Change / Approach-Change; each has defined routing and bounce-counter effect. Logged with `CR` event type.
- [ ] **Sprint-report prefill + close pipeline** — `prefill_report.mjs` auto-fills deterministic YAML fields in agent reports from state.json (reduces malformed frontmatter); `close_sprint.mjs` validates terminal states, archives report, runs `suggest_improvements.mjs` + `sprint_trends.mjs` unconditionally. Sprint Report written *before* state flips to Completed (pre-step-7 gate).
- [ ] **Sprint Report v2 template** — adds §1 "What Was Delivered" (user-facing vs internal split), §3 Execution Metrics with bounce ratio / correction tax / first-pass success rate, §5 Framework Self-Assessment tables categorised by Templates/Handoffs/Skills/Process/Tooling.
- [ ] **run_script.sh wrapper** — all scripts invoked via this wrapper; captures stdout/stderr separately, structured diagnostics on failure, documented self-repair recipes (missing state.json → re-init; permission denied → chmod; etc.).
- [ ] **Sprint Context file** — `.cleargate/sprint-runs/<id>/sprint-context.md` auto-included in every agent task brief: locked dep versions, cross-cutting design tokens, active FLASHCARD tags for this sprint.
- [ ] **Adjacent implementation check** — when Architect drafts a story's implementation plan, scan already-merged stories in the same sprint and list "Reuse these existing modules" hints; prevents duplicate impl across parallel stories.
- [ ] **Sprint Planning v2 — Architect Design Review + decomposition signals + Gate-2 teeth.** Three planning-phase changes that precede execution v2: (a) **Architect Sprint Design Review** — before human confirms a v2 Sprint Plan, Architect writes Sprint Plan §2 "Execution Strategy" containing phase plan (parallel vs sequential groups), merge ordering from shared-file surface analysis, shared-surface warnings, ADR-conflict flags; (b) **decomposition signals on every story** — `parallel_eligible: y|n` + `expected_bounce_exposure: low|med|high`, used during plan review to flag risky concentrations; (c) **Gate 2 becomes enforcing for v2** — 🔴 High-ambiguity epics cannot enter v2 execution without explicit human override (spikes remain out-of-scope deferral).

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- **DevOps agent as a fifth role.** We keep the four-agent contract. Merge + post-merge validation stays with Developer (extended checklist) and orchestrator. Re-evaluate after this epic ships.
- **Scribe agent + product docs (`vdocs/`).** ClearGate has no public product-doc surface yet; defer until marketing site lands.
- **Ambiguity Score + mandatory Spikes for L4/🔴 stories.** Our template already ships `ambiguity` frontmatter; formal spike-before-code flow is a separate future epic.
- **TDD Red/Green split with test-pattern gate between phases.** Opt-in per story is attractive but doubles agent orchestration complexity; park until we have a story where test-gaming risk is real.
- **Fast Track / Hotfix path for L1 trivial.** We already handle trivia informally. Formalize only if metrics show cost.
- **Cursor/Gemini/Codex cross-tool support.** ClearGate is Claude Code-native; no cross-tool task-file fallback in v2.
- **`vbounce trends` cross-sprint analytics UI.** We'll compute the numbers inside the sprint report; dashboards wait until SPRINT-05's admin UI ships.
- **React-best-practices rules library** (V-Bounce ships ~50 rule files). Out of scope; we use flashcards instead.

## 3. The Reality Check (Context)

**Operating constraints (authoritative — enforced by tests, protocol, and gate checks):**

- Four-agent contract is preserved: architect / developer / qa / reporter. Adding a DevOps or Scribe role is out-of-scope for v2 — re-evaluate after 2 v2 sprints (EPIC-013 Q5).
- `execution_mode: v1` stays the default until SPRINT-11; SPRINT-09 itself runs under v1 while building v2, so no story may invoke v2 commands mid-sprint (SPRINT-09 R1).
- Nested `mcp/` repo is off-limits for worktrees: single outer-repo worktree, edit `mcp/` inside it normally. An agent attempting `git worktree add` inside `mcp/` is blocked by flashcard `#worktree #mcp` (SPRINT-09 R2).
- All new scripts are Node built-ins + git + bash; no new runtime dependencies across any package.
- Every new scaffold surface lands in three places: `.cleargate/` + `cleargate-planning/` + (where applicable) repo-root config. Missing any → QA kicks back (SPRINT-09 R9).
- `state.json` schema is locked at `schema_version: 1` when STORY-013-02 merges; any change after that bumps the field, never silent (SPRINT-09 R3).
- `.cleargate/wiki/` is compiled output — never edit writers; work items flow through the existing PostToolUse ingest hook on `pending-sync/`.
- No MCP adapter, admin-UI, or scaffold-manifest surface changes. Execution-loop only.

| Constraint Type | Limit / Rule |
|---|---|
| Repo topology | Three repos: this one (delivery + scaffold), `cleargate-mcp` (nested), admin (stub). Worktrees belong to THIS repo only; do not try to worktree the nested `mcp/` submodule. |
| Existing contract | Four agents: architect / developer / qa / reporter. Their `.md` specs in `.claude/agents/` are authoritative. Changes go there, not in protocol prose. |
| Wiki compatibility | `.cleargate/wiki/` is compiled output. Do not rewrite wiki writers. EPIC-013 work items must flow through existing ingest hook (PostToolUse on pending-sync/). |
| Pre-commit | `npm run typecheck` + `npm test` must stay green per package. Worktree mode must not break this. |
| Git safety | Never `--no-verify`, `reset --hard`, or force-push. Worktree removal OK because branch is merged first; bare branch deletion only after merge. |
| Flashcard skill | `.claude/skills/flashcard/SKILL.md` stays authoritative for format. Gate adds *timing*, not format. |
| MCP push | Every new file under `pending-sync/` participates in gate-check and remote push. EPIC-013 artefacts (state.json, sprint-runs/) are LOCAL-ONLY and must be added to the no-push allowlist. |
| Token ledger | `.claude/hooks/token-ledger.sh` on SubagentStop stays untouched; it's the third token-source in Reporter's cross-check. |
| Reversibility | Feature rollout must be opt-in per sprint via a `--exec-v2` flag or frontmatter `execution_mode: v2` on the Sprint Plan, so SPRINT-09 can run v1 if we find a blocker post-decomposition. |

## 4. Technical Grounding (V-Bounce Reference Map)

*(Every in-scope item below cites the exact V-Bounce file to read, what to copy, and what to adapt for ClearGate.)*

**Affected Files:**

- `.claude/agents/developer.md` — append § Worktree Contract + § Circuit Breaker; add `flashcards_flagged` field requirement
- `.claude/agents/qa.md` — require `flashcards_flagged` field in report frontmatter
- `.claude/agents/architect.md` — append § Adjacent Implementation Check + § Sprint Design Review contract
- `.claude/agents/reporter.md` — rewrite against new Sprint Report v2 template
- `.cleargate/knowledge/cleargate-protocol.md` — append §§10–13 (worktree lifecycle, flashcard gate, user walkthrough, mid-sprint CR triage)
- `.cleargate/templates/story.md` — add `parallel_eligible` + `expected_bounce_exposure` frontmatter
- `.cleargate/templates/Sprint Plan Template.md` — add `execution_mode: v1|v2` frontmatter + §2 Execution Strategy section
- `.cleargate/templates/sprint_report.md` — new template (ports V-Bounce `templates/sprint_report.md`)
- `.cleargate/templates/sprint_context.md` — new template (ports V-Bounce `templates/sprint_context.md`)
- `.cleargate/scripts/run_script.sh` — new wrapper (ports V-Bounce `scripts/run_script.sh`)
- `.cleargate/scripts/pre_gate_runner.sh` + `pre_gate_common.sh` + `init_gate_config.sh` — new pre-gate scanner
- `.cleargate/scripts/init_sprint.mjs` + `update_state.mjs` + `validate_state.mjs` + `validate_bounce_readiness.mjs` + `constants.mjs` — new state-lifecycle scripts
- `.cleargate/scripts/complete_story.mjs` + `close_sprint.mjs` + `prefill_report.mjs` + `suggest_improvements.mjs` — new sprint-close pipeline
- `.gitignore` (repo root) — append `.worktrees/`
- `cleargate-planning/**` — scaffold-mirror all of the above for three-surface landing (EPIC-013 R9)

**Data Changes:**

- `.cleargate/sprint-runs/<sprint-id>/state.json` (new) — `{schema_version: 1, sprint_id, execution_mode, stories: {[id]: {state, qa_bounces, arch_bounces, updated_at, notes}}, sprint_status, last_action, updated_at}`.
- `.cleargate/sprint-runs/<sprint-id>/sprint-context.md` (new per sprint).
- `.cleargate/sprint-runs/<sprint-id>/improvement-suggestions.md` (new per sprint, auto-appended by `suggest_improvements.mjs` at close).

### 4.1 Reference Repo

- **V-Bounce Engine** — `github.com/sandrinio/V-Bounce-Engine@main`
- Most load-bearing files:
  - `skills/agent-team/SKILL.md` — the bounce orchestration playbook (Steps 0–7, worktree strategy, report naming, edge cases). Our source for §§4.2–4.10.
  - `OVERVIEW.md` — system diagram (6 agents, story state machine, release lifecycle).
  - `scripts/*.mjs` — executable references we port and simplify.
  - `templates/sprint_report.md` — Sprint Report v2 template we adopt with light renaming.

### 4.2 Capability → Reference → ClearGate Destination

| Capability | V-Bounce Reference | What to Copy | What to Adapt | ClearGate Destination |
|---|---|---|---|---|
| Worktree per story | `skills/agent-team/SKILL.md` §§ "Git Worktree Strategy" + "Worktree Commands" | Branch hierarchy (`main → sprint/S-XX → story/STORY-NNN-NN`), `.worktrees/` directory layout, `git worktree add/remove` recipe | Strip `vbounce` naming → `cleargate`; `.worktrees/` stays gitignored; our story IDs are `STORY-NNN-NN` (already compatible) | `.claude/agents/developer.md`, `.cleargate/knowledge/cleargate-protocol.md` §10 (new), `.gitignore` |
| Pre-gate scanner | `scripts/pre_gate_runner.sh` + `scripts/pre_gate_common.sh` + `scripts/init_gate_config.sh` | Two-mode shell script (`qa` / `arch`), stack auto-detection, debug-statement / TODO / new-dep checks | Our stack is Node + TS only (Fastify, Drizzle, SvelteKit) — drop Python/Go detectors; wire `npm run typecheck` and `npm test` into the `qa` mode | `.cleargate/scripts/pre_gate_runner.sh`, `.cleargate/scripts/gate-checks.json` |
| state.json + bounce counters | `scripts/init_sprint.mjs` + `scripts/update_state.mjs` + `scripts/validate_state.mjs` + `scripts/validate_bounce_readiness.mjs` + `scripts/constants.mjs` (`TERMINAL_STATES`) | Schema (`sprint_id`, `stories[id] = {state, qa_bounces, arch_bounces, updated_at}`), terminal-state list, state-transition CLI | Our story IDs are 3-part (`STORY-NNN-NN`), not 2-part; path is `.cleargate/sprint-runs/<id>/state.json`, not `.vbounce/state.json` | `.cleargate/scripts/init_sprint.mjs`, `update_state.mjs`, `validate_state.mjs`, `validate_bounce_readiness.mjs` |
| Circuit breaker | `skills/agent-team/SKILL.md` § "Step 2f: Green Phase Circuit Breaker (Blockers Report Handling)" | 50-tool-call heuristic; Blockers Report sections (Test-pattern / Spec-gap / Environment); re-launch vs escalate triage | We don't have TDD Red/Green, so the heuristic applies to any Developer run; simplify triage to 3 categories | `.claude/agents/developer.md` (new § "Circuit Breaker"), `.claude/agents/architect.md` (triage rules) |
| Immediate flashcard gate | `skills/agent-team/SKILL.md` § "Step 5.5: Immediate Flashcard Recording (Hard Gate)" | The rule "do not create next story's worktree until flashcard confirmation complete"; source fields (`flashcards_flagged` in Dev report, QA report scan) | Hook directly into our existing flashcard skill (`.claude/skills/flashcard/SKILL.md`) — no new format, just new timing | `.claude/agents/developer.md` + `qa.md` (require `flashcards_flagged` field); `.cleargate/knowledge/cleargate-protocol.md` §11 (new) |
| User walkthrough on sprint branch | `skills/agent-team/SKILL.md` § "Step 5.7: User Walkthrough (Post-Delivery Review)" | Review Feedback vs Bug split; `UR` event type; "run on sprint branch before main" rule | Our Reporter runs at sprint end — walkthrough step runs *before* Reporter is spawned | `.cleargate/knowledge/cleargate-protocol.md` §12 (new), `.cleargate/templates/Sprint Plan Template.md` (§ Execution Log) |
| Mid-sprint CR triage | `skills/agent-team/SKILL.md` § "Mid-Sprint Change Requests" + `skills/agent-team/references/mid-sprint-triage.md` | 4-category table (Bug / Spec-Clarification / Scope-Change / Approach-Change) with bounce-counter effects; `CR` event type | Fetch `mid-sprint-triage.md` during decomposition and port inline — keep categories identical for future cross-tool compatibility | `.cleargate/knowledge/cleargate-protocol.md` §13 (new) |
| Sprint-close pipeline | `scripts/close_sprint.mjs` + `scripts/complete_story.mjs` + `scripts/prefill_report.mjs` + `scripts/suggest_improvements.mjs` + `scripts/sprint_trends.mjs` + `scripts/post_sprint_improve.mjs` | "Sprint report written BEFORE state = Completed" (pre-step-7 gate), archive to `<sprint>/` dir, auto-run `suggest_improvements.mjs` on close, three-source token aggregation with 20% divergence guard | Our ledger is `.cleargate/sprint-runs/<id>/token-ledger.jsonl` (already-populated by SubagentStop hook); make it the primary source, task notifications secondary; script reconciliation primary | `.cleargate/scripts/close_sprint.mjs`, `complete_story.mjs`, `prefill_report.mjs`, `suggest_improvements.mjs` |
| Sprint Report v2 | `templates/sprint_report.md` | §§1–6 structure (What Delivered / Story Results / Metrics / Lessons / Retrospective / Change Log); Framework Self-Assessment split by Templates/Handoffs/Skills/Process/Tooling; Bug-Fix Tax vs Enhancement Tax split | Our current `sprint-runs/<id>/REPORT.md` has no template — adopt this wholesale with s/vbounce/cleargate/; strip `vdoc_staleness` section (no vdocs) | `.cleargate/templates/sprint_report.md` (new), `.claude/agents/reporter.md` (updated to write against template) |
| run_script.sh wrapper | `scripts/run_script.sh` + § "Script Execution Protocol" in `skills/agent-team/SKILL.md` | Wrapper captures stdout/stderr separately, structured diagnostic block on failure, documented self-repair recipes | Port verbatim (it's bash) — change path prefix | `.cleargate/scripts/run_script.sh` |
| Sprint context file | `skills/agent-team/SKILL.md` Step 7 "Sprint Context File" + `templates/sprint_context.md` | One file per sprint, listing locked-version rules + cross-cutting design/UI tokens + active FLASHCARD tags | Tie FLASHCARD tag list to output of `grep '#schema\|#auth\|...' .cleargate/FLASHCARD.md` — keep fresh automatically | `.cleargate/templates/sprint_context.md` (new), `.cleargate/sprint-runs/<id>/sprint-context.md` (per-sprint instance) |
| Adjacent implementation check | `skills/agent-team/SKILL.md` Step 1b "Adjacent implementation check" | Rule: when Architect plans story N, scan already-merged stories in sprint for modules to reuse, inject as "Reuse these existing modules: {list}" into the story's implementation plan | Our Architect already writes `plans/M<N>.md` per milestone — add a subsection; our parallelism is lower so impact is moderate but signal stays clear | `.claude/agents/architect.md` |

### 4.3 Files We Explicitly Keep

- `.claude/agents/architect.md`, `developer.md`, `qa.md`, `reporter.md` — patch, do not rewrite. Role contracts stay.
- `.claude/hooks/token-ledger.sh` — already ships SPRINT-08's three-source aggregation foundation. Keep untouched.
- `.cleargate/FLASHCARD.md` — format and placement unchanged.
- Existing wiki ingest/lint/query subagents — untouched; they observe work items, they don't execute them.

### 4.4 New Files / Directories

- `.worktrees/` (gitignored, new) — ephemeral story worktrees
- `.cleargate/scripts/` (new) — ten scripts listed in §0 `<target_files>`
- `.cleargate/sprint-runs/<id>/state.json` (new per sprint)
- `.cleargate/sprint-runs/<id>/sprint-context.md` (new per sprint)
- `.cleargate/templates/sprint_report.md` (new)
- `.cleargate/templates/sprint_context.md` (new)
- `.cleargate/knowledge/cleargate-protocol.md` §§10–13 (appended)

### 4.5 How Sprint Closure Will Work (Synthesized)

> This answers the user's second ask — "check how sprint report is made / sprint closure."

Current (SPRINT-08 baseline):
1. Reporter agent spawned at end of sprint, reads token-ledger + git log + flashcards + story files.
2. Writes `.cleargate/sprint-runs/<id>/REPORT.md`.
3. Human manually archives sprint file from `pending-sync/` → `archive/` and cleans active-sentinel wiki page.

Post-EPIC-013 (target):
1. **Pre-close gate (new):** orchestrator runs `close_sprint.mjs S-XX` which refuses to proceed if any story in state.json is non-terminal. Reporter cannot be spawned until state.json is clean.
2. **Prefill (new):** if any agent report is missing its deterministic YAML fields, `prefill_report.mjs` backfills them from state.json so Reporter doesn't have to guess.
3. **Reporter writes REPORT.md against the new template** (`templates/sprint_report.md`) — §1 user-facing delivered, §2 story results + CRs, §3 metrics (bounces / tax / first-pass), §4 lessons (already recorded by immediate-flashcard gate), §5 retrospective + Framework Self-Assessment, §6 change log.
4. **Token aggregation** reconciled across three sources: `token-ledger.jsonl` (primary — already authoritative from SubagentStop hook), story-doc Token Usage tables (secondary), task-completion notifications (tertiary). Reporter flags any source that diverges >20% from the primary.
5. **State flip → Completed** happens AFTER the report is written and presented to user, not before. This is the "pre-step-7 gate" from V-Bounce.
6. **Auto-run improvement pipeline:** `close_sprint.mjs` invokes `suggest_improvements.mjs` unconditionally — reads §5 Framework Self-Assessment from the report, produces a prioritized `.cleargate/sprint-runs/<id>/improvement-suggestions.md`. Orchestrator presents P0/P1 items to user verbally with "Want me to apply any of these?"
7. **Archive + wiki sync:** sprint file moves pending-sync → archive; active-sprint wiki page cleared; existing ingest hook takes it from there.

## 5. Acceptance Criteria

```gherkin
Feature: Execution Phase v2

  Scenario: Parallel story isolation
    Given two independent stories STORY-014-01 and STORY-014-02 are in "Ready to Bounce"
    When the orchestrator spawns two Developer agents simultaneously
    Then each agent runs inside its own .worktrees/STORY-014-0X/ directory
    And neither agent's commits appear on the other's branch before merge
    And post-merge tests on sprint/S-XX pass for both merges

  Scenario: Pre-gate scanner bounces mechanical failure cheaply
    Given a Developer has just written an implementation report with a console.log left in src/
    When the orchestrator invokes pre_gate_runner.sh qa .worktrees/STORY-014-01/ sprint/S-XX
    Then the scanner exits non-zero and names the offending file
    And the QA agent is NOT spawned
    And the story returns to Developer with the scan output as input
    And qa_bounces counter in state.json is NOT incremented

  Scenario: Independent bounce counters with 3-strike escalation
    Given STORY-014-03 has qa_bounces=2 in state.json
    When the QA agent writes its third consecutive fail report
    Then update_state.mjs STORY-014-03 --qa-bounce sets qa_bounces=3
    And state.state flips to "Escalated"
    And sprint markdown §1 is updated atomically
    And no Architect run is attempted

  Scenario: Circuit breaker on runaway Developer
    Given the Developer on STORY-014-04 has executed 50 tool calls with no successful test run
    When the Developer agent reaches its 51st tool call
    Then it writes STORY-014-04-dev-blockers.md instead of a dev report
    And the report categorises the blocker as one of Test-Pattern / Spec-Gap / Environment
    And the orchestrator routes per the matching triage rule without auto-retrying the same approach

  Scenario: Immediate flashcard hard gate
    Given STORY-014-05 has just been merged into sprint/S-XX
    And STORY-014-05-dev.md has flashcards_flagged: ["2026-04-22 · #test-harness · vitest fake-timers conflict with worker.spawn"]
    When the orchestrator attempts to create the .worktrees/STORY-014-06/ worktree
    Then it first presents each flagged flashcard to the user
    And upon approval records them to .cleargate/FLASHCARD.md immediately
    And only then proceeds with worktree creation

  Scenario: User walkthrough splits enhancement from bug
    Given all stories in sprint/S-XX are merged to sprint branch
    When the user runs the app on sprint/S-XX and gives two pieces of feedback
    And feedback A is "copy should say 'Sign in' not 'Log in'"
    And feedback B is "create-project button 500s on submit"
    Then feedback A is logged in sprint markdown §4 as UR:review-feedback and does NOT increment correction_tax
    And feedback B is logged as UR:bug and IS counted toward Bug-Fix Tax in §3
    And the sprint does not merge to main until both are resolved on the sprint branch

  Scenario: Error path — sprint close refuses non-terminal state
    Given state.json has STORY-014-07 in state "Bouncing"
    When the orchestrator runs close_sprint.mjs S-XX
    Then the script exits non-zero
    And prints "STORY-014-07: Bouncing — not terminal. Refuse to close."
    And the sprint report is NOT generated

  Scenario: Sprint report written before state = Completed
    Given all stories in state.json are terminal
    When close_sprint.mjs S-XX runs
    Then REPORT.md is written first using templates/sprint_report.md
    And the report is presented to the user with §3 metrics and §5 self-assessment
    And only after user acknowledgement does state.sprint_status flip to "Completed"
    And suggest_improvements.mjs runs unconditionally and writes improvement-suggestions.md

  Scenario: Token reconciliation flags divergent source
    Given token-ledger.jsonl reports total 820,000 tokens for sprint S-XX
    And task-notification totals report 1,120,000 tokens
    When Reporter computes the §3 Execution Metrics
    Then it reports the ledger primary (820k), notes task-notification secondary (1.12M), and flags divergence = 36% > 20% threshold
    And the flag appears in §5 Framework Self-Assessment > Tooling & Scripts as a Friction finding

  Scenario: run_script.sh self-repair on missing state.json
    Given .cleargate/sprint-runs/S-XX/state.json is deleted
    When the orchestrator calls run_script.sh update_state.mjs STORY-014-01 "Bouncing"
    Then the wrapper prints a structured diagnostic naming the missing file
    And the orchestrator runs run_script.sh init_sprint.mjs S-XX --stories {IDS} exactly once as self-repair
    And the retry of update_state succeeds
    And the incident is logged in the agent report under ## Script Incidents
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question 1:** Should we retro-draft **PROPOSAL-010** before decomposing this epic? The protocol (§2.5 of `cleargate-protocol.md`) requires a Proposal as Gate 1 for any Epic, and this epic has wide surface area (10 new scripts + 4 agent rewrites + 4 new protocol sections). A proposal would let us timebox the "do we really port all 12 items or just the top 4?" question before investing in decomposition.
  - **Human Answer (2026-04-21):** Skip the retro-proposal. Approve EPIC-013 directly. Intent here is sharp ("port V-Bounce execution patterns, cite each reference"); drafting a proposal would restate §4.2 back as prose. Per-action human approval overrides the default gate as a documented protocol exception.

- **AI Question 2:** **Opt-in rollout or big-bang?** Option A — ship v2 behind an `execution_mode: v2` frontmatter flag on the Sprint Plan so SPRINT-09 can stay on v1 if decomposition exposes blockers. Option B — port everything and let SPRINT-09 be the validation sprint (slower start, faster long-term). Option A is safer; Option B is cleaner and avoids a long-lived fork in agent behavior.
  - **Human Answer (2026-04-21):** **Option A — opt-in `execution_mode: v2` flag.** First-sprint bugs on v2 would otherwise be indistinguishable from v2 framework bugs. Flag cost ~2h. Remove it in SPRINT-11 after two green sprints on v2. Add `execution_mode` (enum: `v1` | `v2`, default `v1` for now) to the Sprint Plan frontmatter.

- **AI Question 3:** Worktrees live at `.worktrees/` in repo root. The MCP server is a **nested separate git repo** at `mcp/`. Git worktrees on nested repos behave poorly. Confirm: **stories that touch `mcp/` execute in the ClearGate outer repo worktree, and `mcp/` edits happen inside that outer worktree as normal**, correct? Or do we need a second worktree hierarchy per repo?
  - **Human Answer (2026-04-21):** **Single outer-repo worktree; edit `mcp/` inside it normally.** Nested-repo worktrees are a known git footgun. Stories that touch `mcp/` commit to `mcp/` on its own branch from inside the outer worktree — that's what we already do today. No second hierarchy. Add a flashcard (`#worktree #mcp`) if an agent ever tries `git worktree add` inside `mcp/`.

- **AI Question 4:** **Parallelism gate.** V-Bounce allows parallel Developer agents by default. ClearGate's flashcard gate is *sequential by design* (new stories can't start until the previous story's flashcards are processed). This makes our parallelism limited to stories initialized in the same batch. Is that OK, or do we want a separate "flashcard window" that runs async so parallelism doesn't stall?
  - **Human Answer (2026-04-21):** **Accept sequential-by-design. Do NOT add an async flashcard window.** Flashcard context decays in minutes, not sprints — async defeats the whole point. If parallelism becomes the bottleneck (unlikely at our current 6-story sprints), revisit. No premature optimization.

- **AI Question 5:** **DevOps agent — truly defer?** V-Bounce's DevOps role owns merge + post-merge validation + worktree cleanup. We're keeping that in Developer. Risk: Developer's scope balloons (implement + test + merge + validate + cleanup); catches fewer post-merge regressions because the same agent that wrote the code is validating the merge. Re-confirm deferral, or split into Developer + DevOps now?
  - **Human Answer (2026-04-21):** **Defer DevOps split. Extend Developer's post-merge checklist instead.** Port the *checklist* (pre-merge worktree-clean, post-merge `npm test` on sprint branch, revert-on-fail) into `developer.md` §Merge. Revisit after 2 sprints on v2 — if post-merge regressions escape, split then.

- **AI Question 6:** **Correction Tax methodology.** V-Bounce defines it as % human intervention needed per story. Our equivalent today is vibes. Define formally: is a human "intervention" counted per **message**, per **file edit**, per **distinct correction**, or as **human-turn-count / total-turn-count**? The choice drives how many places we instrument.
  - **Human Answer (2026-04-21):** **Correction Tax = `human_edits_or_redirects / total_agent_invocations`, counted per story.**
    - "Human edit" = user directly modified a file the agent wrote.
    - "Redirect" = user told agent to change approach mid-execution (not a clarification).
    - Orchestrator logs each event to sprint markdown §4 with `CR` event type; Reporter tallies into §3 Execution Metrics.
    - Turn-count rejected (chit-chat inflates denominator); per-file-edit rejected (one big refactor would tax the same as one typo).

- **AI Question 7:** **MCP authority boundary.** state.json and sprint-runs artefacts are LOCAL-ONLY. But the sprint markdown itself (which state.json shadows) IS pushed to the PM tool via MCP. When state.json and the sprint markdown disagree (e.g., state.json says "Escalated" but MCP-synced remote copy is stale), which wins? Proposal: local state.json always wins for IN-FLIGHT; MCP is the post-facto audit log.
  - **Human Answer (2026-04-21):** **Local state.json wins for in-flight. MCP is post-facto audit log.** Ship as a one-line rule in protocol §10. Sync happens only at story-merge (`complete_story.mjs` pushes snapshot to MCP) and sprint-close (`close_sprint.mjs` pushes final report). No continuous reconciliation; no PM-tool latency stalling the bounce loop.

- **AI Question 8:** **Story granularity for this epic itself.** Target 8–10 stories across ~2 milestones. Suggested cuts:
  1. Worktree + branch hierarchy (L3)
  2. state.json + update_state + validate_bounce_readiness (L3)
  3. Pre-gate scanner + run_script.sh wrapper (L2)
  4. Circuit breaker in developer.md + Blockers Report triage in architect.md (L2)
  5. Immediate flashcard gate + protocol §11 (L2)
  6. User walkthrough + protocol §12 + mid-sprint CR triage §13 (L2)
  7. Sprint Report v2 template + prefill_report.mjs (L2)
  8. close_sprint.mjs + suggest_improvements.mjs + ledger reconciliation (L3)
  9. Sprint Context file + adjacent implementation check in architect.md (L2)
  10. Dogfood SPRINT-09 on v2 + capture framework self-assessment (L3)

  Confirm the cut, or propose different boundaries?
  - **Human Answer (2026-04-21, revised same day):** **9 stories, 2 milestones.** Initially locked at 8; expanded to 9 after sprint-planning impact review surfaced a dedicated planning-phase story (STORY-013-09). Two original tweaks still stand:
    - **Merge original Stories 4 + 6** into one "Orchestrator Interrupt Handling" story (circuit breaker + walkthrough + mid-sprint CR triage all land in the same protocol sections and share the orchestrator-facing rule surface).
    - **Drop original Story 10 (Dogfood SPRINT-09).** Dogfooding happens naturally when SPRINT-10 runs on v2 — doesn't need to be a planned story. Instead, add an acceptance criterion to Story 7 (close_sprint.mjs): "writes a v2-adoption note to the sprint report's §5."

    **Final 9-story cut (revised 2026-04-21 after sprint-planning impact review):**
    - **M1 — Infrastructure (4 stories):**
      1. STORY-013-01 — Worktree + branch hierarchy (L3)
      2. STORY-013-02 — state.json + update_state + validate_bounce_readiness (L3)
      3. STORY-013-03 — run_script.sh wrapper + pre-gate scanner (L2)
      4. STORY-013-04 — Sprint Context file + adjacent implementation check in architect.md (L2)
    - **M2 — Agent + protocol changes (5 stories):**
      5. STORY-013-05 — Orchestrator interrupt handling: circuit breaker in developer.md + Blockers triage in architect.md + user walkthrough + mid-sprint CR triage (L3)
      6. STORY-013-06 — Immediate flashcard gate + protocol §11 (L2)
      7. STORY-013-07 — Sprint Report v2 template + prefill_report.mjs + close_sprint.mjs + suggest_improvements.mjs + ledger reconciliation (L3)
      8. STORY-013-08 — `execution_mode: v2` opt-in flag: Sprint Plan template frontmatter + orchestrator gate that routes v1 vs v2 loops (L2)
      9. **STORY-013-09 — Sprint Planning v2: Architect Design Review + decomposition signals + enforcing Gate 2 (L2)**
         - Extend `.claude/agents/architect.md` with Sprint Design Review contract: before human confirms a v2 Sprint Plan, Architect writes §2 "Execution Strategy" — phase plan (parallel vs sequential groups), merge ordering from shared-file surface analysis, shared-surface warnings, ADR-conflict flags.
         - Extend `.cleargate/templates/story.md` frontmatter with two fields: `parallel_eligible: y|n` and `expected_bounce_exposure: low|med|high`.
         - Extend `.cleargate/templates/Sprint Plan Template.md` with a new §2 "Execution Strategy" section that Architect fills; §1 story table columns updated to surface the new per-story signals.
         - Extend `.cleargate/knowledge/cleargate-protocol.md` §2 (Gate 2): for `execution_mode: v2` sprints, 🔴 ambiguity epics are BLOCKED from bounce start without explicit human override, captured in Sprint Plan §0 Readiness Gate.
         - V-Bounce ref: `skills/agent-team/SKILL.md` § "Architect Sprint Design Review (Phase 2 → Phase 3 transition)" + § "Step 0.5: Discovery Check (L4 / 🔴 Stories Only)".

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Decomposition)**

All eight §6 questions answered 2026-04-21. Proposal gate waived by direct human approval (Q1). Rollout behind `execution_mode: v2` flag (Q2). Story cut locked at **9 stories across 2 milestones** (Q8, revised same-day after sprint-planning impact review — added STORY-013-09 for Architect Design Review + decomposition signals + enforcing Gate 2).

Requirements to pass to 🟢 (Ready for Decomposition):
- [x] AI Questions Q1–Q7 answered inline.
- [x] Q8 story cut confirmed (9 stories, 2 milestones — expanded 2026-04-21 to include STORY-013-09 Sprint Planning v2).
- [x] `<agent_context>` target_files reconciled against Q2/Q5 decisions (DevOps split deferred; `execution_mode` flag added to Sprint Plan template scope).
- [ ] §4.2 table: every row cross-checked against V-Bounce `main` HEAD SHA pinned in this frontmatter. *(Architect: pin SHA during M1 planning.)*
- [x] 0 unresolved placeholders in the document.
