---
epic_id: EPIC-030
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🔴 High
context_source: conversation 2026-05-20 — proposal gate waived per feedback_proposal_gate_waiver.md (Gate-1 direct approval; four-mechanism design specified inline by sandrinio)
area: planning-orchestration
owner: sandrinio
target_date: TBD
created_at: 2026-05-20T00:00:00Z
updated_at: 2026-05-20T00:00:00Z
created_at_version: 0.10.x
updated_at_version: 0.10.x
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: parent-approved
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter; parent-approved-initiative: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter"
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-20T11:57:21Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-030
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-20T11:57:21Z
  sessions: []
---

# EPIC-030: AI-Driven Sprint Planning Orchestration

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace judgment-based sprint planning with a four-mechanism deterministic orchestration layer: prioritized backlog grooming, conflict-graph parallel selection, drift bounding at session-start, and out-of-sprint research spikes.</objective>
  <architecture_rules>
    <rule>Must extend existing Sprint Plan Template §2 SDR — algorithm output writes into existing slots (Phase Plan, Merge Ordering, Lane Audit), does not replace the template structure.</rule>
    <rule>Must reuse wiki topic-page mechanism (cleargate wiki query --persist) for spike findings — no new artifact type.</rule>
    <rule>Must reuse cleargate doctor --session-start surface for drift checks — extends, does not fork.</rule>
    <rule>No PM-tool push for spike artifacts — wiki topics are local-only.</rule>
    <rule>Algorithm is advisory in v1 mode (warn + render Brief), enforcing in v2 mode (halt on drift / unjustified spike / capacity overflow). Same pattern as existing execution_mode field.</rule>
    <rule>No new heavyweight Spike work-item type — lightweight rule (topic page by default; SPIKE-NNN.md only when affects ≥2 stories OR &gt;2h budget).</rule>
    <rule>No changes to MCP push/pull semantics or PM-tool adapters.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/lib/sprint-planner/groom.ts" action="create" />
    <file path="cleargate-cli/src/lib/sprint-planner/conflict-graph.ts" action="create" />
    <file path="cleargate-cli/src/lib/sprint-planner/capacity.ts" action="create" />
    <file path="cleargate-cli/src/lib/sprint-planner/drift.ts" action="create" />
    <file path="cleargate-cli/src/lib/sprint-planner/spike-runner.ts" action="create" />
    <file path="cleargate-cli/src/commands/doctor.ts" action="modify" />
    <file path="cleargate-cli/src/commands/sprint.ts" action="modify" />
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path=".claude/skills/spike-execution/SKILL.md" action="create" />
    <file path=".cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

Today's sprint planning has four soft spots that compound into bad sprints:

1. **No global priority discipline.** `priority` is item-local; ties are common; nobody re-ranks on a schedule. AI silently picks by file mtime or alphabetical drift.
2. **Parallelism is Architect judgment.** Sprint Plan Template §2.2 Merge Ordering is filled by hand. Architects routinely miss shared-file conflicts on generated artifacts (`MANIFEST.json`, wiki index, lockfiles) and under-pack waves that could safely run 4-wide.
3. **Status drift accumulates between sprint closes.** CR-017 lifecycle reconciler runs at sprint close — too late. Items marked `In Progress` after a worktree died last week stay that way until close, polluting candidate selection.
4. **Mid-sprint spikes blow up worktrees.** "Wait, how does PM-tool X's webhook auth actually work?" mid-story → dev idle, Architect plan wrong, sprint slips. The flashcard log has CR-039 as one example; SPRINT-XX flashcards show others.

**What we're building:**

A deterministic four-mechanism orchestration layer (not a replacement for human judgment — an enforcement floor):

1. **Backlog grooming pass** — at session-start, AI proposes priority deltas based on dep chains, recency, and ambiguity-readiness; human confirms via Brief.
2. **Conflict-graph parallel selection** — programmatic shared-file-surface scan; max-independent-set selection up to cap of 4 per wave; capacity formula accounts for story complexity (L1–L4).
3. **Drift bounding** — `cleargate doctor --drift` flag + pre-pull validation when any agent loads an item; checks PR/worktree/last-commit reality against frontmatter `status:`.
4. **Out-of-sprint spike runner** — `cleargate spike <story-id>` time-boxed research dispatch (2h / 30k tokens hard cap); findings persist as `.cleargate/wiki/topics/<slug>.md`; auto-flips `ambiguity: 🟡 → 🟢` on unblocked story with back-link.

**Success Metrics (North Star):**

- **Parallelism realized:** ≥70% of sprint waves contain ≥3 parallel stories (today: ~40% by manual SPRINT-26..30 audit).
- **Mid-sprint spike count:** 0 per sprint (today: 1–2 per sprint based on flashcard archaeology).
- **Drift at session-start:** 0 items with `status:` divergent from reality (today: surfaced only at sprint close → CR-048 cleanup CR confirms this hurts).
- **Grooming coverage:** 100% of sprint candidates pass through grooming Brief (today: implicit / skipped).
- **Spike justification:** 100% of dispatched spikes meet the 3× cost rule (today: no rule exists).

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] `cleargate sprint groom` command — emits ranked candidate list with proposed priority deltas + one-line rationale per delta
- [ ] `cleargate sprint plan --auto` flag — runs conflict-graph + capacity algorithm against groomed backlog, emits draft `SPRINT-<N>.md` with §2 populated programmatically
- [ ] Shared-file-surface scanner — parses each candidate's `<target_files>` (from §0 agent_context blocks) + Architect plan stubs; produces conflict graph
- [ ] Max-independent-set wave packer with cap=4 (configurable per sprint frontmatter `parallelism_cap:`)
- [ ] Story complexity field `complexity: L1 | L2 | L3 | L4` on story template; capacity formula `parallel × duration_days / Σ(complexity_weight)`
- [ ] `cleargate doctor --drift` flag — scans all `pending-sync/` + `archive/` items, lists drift between `status:` and reality (PR merged? worktree alive? last commit since status update?)
- [ ] Pre-pull validation hook in agent dispatch — runs before any Architect/Dev/QA load; halts on drift in v2 mode, warns in v1
- [ ] `cleargate spike <story-id>` command — time-boxed research dispatch (2h wall-clock OR 30k token hard cap; whichever first)
- [ ] Spike justification gate — refuses to dispatch unless expected story cost ≥ 3× spike cost, OR human override flag `--force`
- [ ] Spike findings persist to `.cleargate/wiki/topics/<spike-slug>.md` via existing `cleargate wiki query --persist` plumbing
- [ ] Auto-flip on unblocked story: `ambiguity: 🟡 → 🟢` + new frontmatter field `unblocked_by_topic: <slug>` + Open Questions field cleared
- [ ] Session-start banner extension — adds drift count: `ClearGate state: member ... — N items with drift (run: cleargate doctor --drift)`
- [ ] Cross-sprint dependency check — `cleargate sprint plan` refuses to schedule story X if blocker Y is in a *later* sprint
- [ ] Skill at `.claude/skills/spike-execution/SKILL.md` — orchestration playbook for AI when user says "spike this"
- [ ] Sprint Plan Template §2 updated to reference algorithm output (algorithm writes; Architect overrides + explains)
- [ ] Protocol section in `cleargate-protocol.md` formalizing the spike contract + drift semantics

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- New heavyweight `Spike.md` template + `SPIKE-NNN` ID space → lightweight wiki-topic by default
- Replacing Architect Sprint Design Review entirely → algorithm populates §2; Architect overrides + writes rationale
- PM-tool sync changes (push/pull semantics) → spikes don't push
- Admin console UI for backlog grooming → separate epic (post-EPIC-021)
- Cross-team / cross-project backlog → single-project scope
- ML-based priority prediction → priority stays human-set; algorithm only proposes deltas based on dep graph + readiness
- Auto-merging spike findings into multiple stories → spike unblocks exactly one named story; multi-unblock requires SPIKE-NNN promotion
- Replacing token-ledger or flashcard mechanism → orthogonal
- Backwards-compat for stories without `complexity:` field → migration script stamps L2 default; agents fail loud if missing

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Pre-pull validation latency | <500ms per item load (else dispatch perceptibly stalls) |
| `doctor --drift` scan time | <5s for typical repo (~200 items in archive + ~30 in pending-sync) |
| Conflict-graph computation | <2s for 30-candidate × 5-files-each input |
| Spike time-box (hard cap) | 2h wall-clock OR 30k tokens — whichever first; surface partial findings to human, no silent overrun |
| Spike justification threshold | expected story cost ≥ 3× spike cost; override requires `--force` + flashcard entry |
| Parallelism cap (default) | 4 concurrent stories per wave; configurable per-sprint via `parallelism_cap:` frontmatter |
| Capacity formula | `floor(parallel × duration_days / Σ(complexity_weight))` where L1=0.25d, L2=0.5d, L3=1d, L4=2d |
| Drift detection scope | source-tree reality (git PR merge state, worktree presence, last commit SHA on story branch) — NOT PM-tool reality (separate concern) |
| Mode behavior | v1 = warn + render Brief; v2 = halt at gate. Same envelope as existing `execution_mode:` field |
| Token budget — grooming | <8k tokens per pass (else AI session-start becomes laggy) |
| Spike findings format | `.cleargate/wiki/topics/<slug>.md` with frontmatter `unblocked_stories: [STORY-NNN-NN, ...]` for back-link integrity |

## 3.5 Existing Surfaces

> L1 reuse audit. Primitives exist; orchestration missing.

- **Surface:** `.cleargate/templates/Sprint Plan Template.md:89–119` — §2 Execution Strategy (Phase Plan, Merge Ordering table, Lane Audit, ADR-Conflict Flags). **Coverage:** ~50% — template asks for this analysis; Architect fills by judgment today. Algorithm will write into the same slots.
- **Surface:** `cleargate-cli/src/commands/doctor.ts` (assumed; verify) + STORY-016-02 `cleargate doctor --session-start` notifier. **Coverage:** ~70% — extension point for `--drift` flag is clean.
- **Surface:** `cleargate wiki query --persist` → writes `.cleargate/wiki/topics/<slug>.md` (Karpathy compounding loop, shipped in SPRINT-04 EPIC-002). **Coverage:** 100% for spike-findings persistence — reuse verbatim.
- **Surface:** [[CR-017]] Lifecycle Status Reconciliation (Completed) — runs at sprint close. **Coverage:** ~40% — same logic, wrong timing; this epic shifts the check to session-start + pre-pull.
- **Surface:** `ambiguity: 🟢/🟡/🔴` frontmatter on all work-item templates. **Coverage:** 100% for gating pickability; this epic adds programmatic flipping after spike.
- **Surface:** `priority` frontmatter field on all work-item templates. **Coverage:** 30% — exists but unused for global ranking; this epic introduces grooming discipline.
- **Surface:** Sprint Plan Template `parallelism_cap:` — **does not exist**, net-new field needed.
- **Surface:** Story complexity sizing — **needs verification.** Story template MAY already have L1-L4; if not, net-new field needed (see §6 question 5).
- **Surface:** [[CR-071]] Sprint Execution Autonomy Contract (Approved, pending merge) — defines autonomous v2 envelope. **Coverage:** ~20% — gives us the mode-switch pattern (warn vs halt) this epic should mirror.
- **Surface:** [[PROPOSAL-013]] Sprint Planning Fast-Track Lane (Approved, closed). **Coverage:** ~10% — covers fast-lane bundling, orthogonal to grooming/parallel/drift/spikes.

## 3.6 Why not simpler?

- **Smallest existing surface that could carry this epic:** Sprint Plan Template §2 + Architect SDR + `cleargate doctor --session-start` + manual flashcard discipline.
- **Why isn't extension / parameterization / config sufficient?**

The current "Architect fills §2 by judgment" works at the median case but fails at three predictable failure modes that hurt every 2–3 sprints:

(1) **Generated-file conflicts are invisible to grep.** Two stories both touching `MANIFEST.json` look unrelated in their target_files lists because one writes it indirectly via `npm run prebuild`. Architect judgment misses this; programmatic scan of the post-build artifact graph catches it.

(2) **Drift only surfaces at sprint close.** CR-048 "Sprint-21 Orphan Drift Cleanup" exists in the archive specifically because drift went undetected for an entire sprint. Manual flashcard reminders don't scale — by the time a human notices a stale `In Progress`, three more agents have loaded the lying frontmatter and made decisions on it.

(3) **Spikes-as-conversation hide spike cost.** Today, "I'll spike that" means the AI runs Read/Grep in the main conversation for 20 minutes, accumulates findings nowhere durable, and the next sprint re-spikes the same question because findings weren't persisted. The wiki-topic mechanism exists; nothing dispatches *into* it on a justified-spike trigger.

Extension alone (better Architect prompts, more flashcard discipline) has been tried twice (SPRINT-09 v2 contract, SPRINT-22 SDLC hardening) and produced incremental gains without closing the failure modes. Algorithmic enforcement is the qualitative step.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

NEW:
- `cleargate-cli/src/lib/sprint-planner/groom.ts` — proposes priority deltas; emits ranked candidate list as JSON + Markdown table
- `cleargate-cli/src/lib/sprint-planner/conflict-graph.ts` — builds shared-file edge set across candidates; computes max-independent-set per wave
- `cleargate-cli/src/lib/sprint-planner/capacity.ts` — runs the `parallel × duration / Σ(complexity)` formula; emits per-sprint capacity budget
- `cleargate-cli/src/lib/sprint-planner/drift.ts` — reality-check per item; emits drift report
- `cleargate-cli/src/lib/sprint-planner/spike-runner.ts` — dispatches research subagent with hard time/token cap; persists findings to wiki/topics
- `cleargate-cli/src/lib/sprint-planner/justification.ts` — evaluates 3× cost rule; gates spike dispatch
- `cleargate-cli/src/commands/spike.ts` — `cleargate spike <story-id>` entry point
- `.claude/skills/spike-execution/SKILL.md` — orchestration playbook for "spike this" intent

MODIFY:
- `cleargate-cli/src/commands/doctor.ts` — add `--drift` flag; extend `--session-start` banner with drift count
- `cleargate-cli/src/commands/sprint.ts` — add `groom` subcommand + `plan --auto` flag
- `cleargate-cli/src/lib/cleargate-state.ts` (verify path) — session-start hook calls drift scan
- `.claude/skills/sprint-execution/SKILL.md` — add grooming pre-step + drift gate before sprint cut
- `.cleargate/templates/Sprint Plan Template.md` — §2 references algorithm output; add `parallelism_cap:` to frontmatter
- `.cleargate/templates/story.md` — add `complexity:` frontmatter field (L1–L4); add `unblocked_by_topic:` optional field
- `.cleargate/knowledge/cleargate-protocol.md` — new §Sprint Planning Algorithm covering grooming, conflict-graph, capacity, drift, spikes

**Data Changes:**

- Story frontmatter: `complexity: "L1" | "L2" | "L3" | "L4"` (required, default L2 for migrated rows)
- Story frontmatter: `unblocked_by_topic: <slug>` (optional, set by spike runner)
- Sprint frontmatter: `parallelism_cap: 4` (optional, default 4)
- Wiki topic frontmatter: `unblocked_stories: [STORY-NNN-NN]` (back-link integrity)
- No DB schema changes — MCP/admin untouched.

## 5. Acceptance Criteria

```gherkin
Feature: AI-Driven Sprint Planning Orchestration

  Scenario: Grooming pass proposes priority deltas
    Given the backlog has 20 pending-sync items with mixed priorities
    And 3 items have unresolved dep chains where blocker is lower-priority than blocked
    When the user runs `cleargate sprint groom`
    Then the command emits a ranked table of all 20 items
    And the table includes proposed priority deltas for the 3 inverted dep chains
    And each delta carries a one-line rationale
    And the command exits 0 without writing files (read-only proposal)

  Scenario: Conflict-graph rejects shared-surface candidates
    Given two stories STORY-A and STORY-B both list `cleargate-cli/src/init/copy-payload.ts` in <target_files>
    And both are ambiguity 🟢 and same priority
    When `cleargate sprint plan --auto` selects parallel candidates
    Then STORY-A is placed in Wave 1
    And STORY-B is placed in Wave 2 (next serial wave) with rationale "shared file: copy-payload.ts with STORY-A"
    And the Brief surfaces the deferral explicitly

  Scenario: Conflict graph respects parallelism cap
    Given 6 mutually disjoint stories are all ambiguity 🟢 + same priority
    When `cleargate sprint plan --auto` runs with default `parallelism_cap: 4`
    Then Wave 1 contains exactly 4 stories
    And the remaining 2 are placed in Wave 2
    And the Brief shows total sprint capacity calculation

  Scenario: Capacity refuses over-packed sprint
    Given a 5-day sprint with parallelism_cap=4 and 12 candidate stories at complexity L3 (1d each)
    When `cleargate sprint plan --auto` runs
    Then it selects 4 × 5 / 1 = 20 story-days budget
    But only 4 × 3 = 12 stories fit (waves serialize)
    And the Brief shows "12 stories fit; 0 deferred to next sprint"

  Scenario: doctor --drift surfaces orphan status
    Given an item STORY-X with frontmatter `status: In Progress`
    And the worktree for STORY-X no longer exists
    And no commits exist on the branch since 7 days
    When the user runs `cleargate doctor --drift`
    Then the command lists STORY-X in the drift report
    And exits non-zero with a one-line remediation hint

  Scenario: Pre-pull validation halts on drift in v2 mode
    Given the active sprint has `execution_mode: v2`
    And STORY-Y has frontmatter `status: Completed`
    But the merge commit for STORY-Y does not exist in main
    When any agent attempts to load STORY-Y
    Then the dispatch halts before agent invocation
    And the error message names STORY-Y and the drift type

  Scenario: Pre-pull validation warns in v1 mode
    Given the active sprint has `execution_mode: v1`
    And STORY-Z has the same drift condition as Scenario above
    When any agent loads STORY-Z
    Then the dispatch proceeds
    And a one-line warning is appended to the agent's first message

  Scenario: Spike runner respects time-box
    Given a story STORY-Q at ambiguity 🟡 with technical-question category
    When the user runs `cleargate spike STORY-Q`
    Then the spike-runner dispatches a research subagent
    And the dispatch carries hard caps: 2h wall-clock AND 30k tokens
    And on cap-hit the subagent surfaces partial findings + exits non-zero
    And no silent overrun is possible

  Scenario: Spike persists findings to wiki topic
    Given a successful spike on STORY-Q resolved within budget
    When the spike completes
    Then `.cleargate/wiki/topics/<spike-slug>.md` is created
    And STORY-Q frontmatter is updated: `ambiguity: 🟡 → 🟢` AND `unblocked_by_topic: <spike-slug>`
    And the wiki topic page lists `unblocked_stories: [STORY-Q]` for back-link integrity

  Scenario: Justification gate rejects unjustified spike
    Given STORY-R is sized L1 (estimated 2h of work)
    And the user runs `cleargate spike STORY-R` for a spike estimated at 1.5h
    When the justification gate evaluates 3× rule (2h < 3 × 1.5h)
    Then the spike is rejected with rationale "story cost (2h) < 3× spike cost (4.5h required)"
    And the user is offered `--force` override (which records a flashcard entry)

  Scenario: Cross-sprint dependency check blocks scheduling
    Given STORY-S has `parent_epic_ref: EPIC-099`
    And EPIC-099's other story STORY-T (blocker) is scheduled for next-sprint
    When `cleargate sprint plan --auto` runs for current sprint
    Then STORY-S is not selected
    And the Brief shows "skipped: blocker STORY-T in SPRINT-N+1"

  Scenario: Session-start banner surfaces drift count
    Given 3 items in the repo have status drift
    When the user starts a Claude Code session
    Then the SessionStart banner includes "3 items with drift (run: cleargate doctor --drift)"
    And the AI does not propose sprint planning until drift is resolved or explicitly waived

  Scenario: Grooming-pass output drives sprint planning
    Given `cleargate sprint groom` has emitted a ranked candidate list
    And the user has accepted (or amended) the priority deltas via Brief
    When `cleargate sprint plan --auto` runs
    Then it selects from the groomed list in rank order
    And does NOT re-rank silently

  Scenario: Algorithm output is overridable by Architect
    Given `cleargate sprint plan --auto` has populated SPRINT-N.md §2
    When the Architect SDR runs in v2 mode
    Then the Architect may override any algorithm decision
    And the override is recorded as a rationale comment in §2.5 ADR-Conflict Flags
    And the Brief surfaces both the algo recommendation AND the Architect override side-by-side
```

## 6. AI Interrogation Loop (Human Input Required)

The Epic stays 🔴 until each of these is answered. Recommended defaults in parentheses.

- **AI Question 1 — Spike justification threshold:** Is the "3× story cost" rule the right gate, or should it be a fixed minimum (e.g., spike only when ≥1h budget AND story is L3+)? *(Recommended: 3× rule, simpler to compute, scales with story size.)* **Human Answer:** _Waiting_

- **AI Question 2 — Drift detection severity:** Should drift detection block session-start, or warn-only? *(Recommended: warn-only in v1 mode, halt at gate in v2 mode — mirrors execution_mode envelope from CR-070/CR-071.)* **Human Answer:** _Waiting_

- **AI Question 3 — Grooming auto-commit:** When grooming proposes priority deltas, does AI commit them automatically to frontmatter, or render Brief and halt for human confirmation? *(Recommended: render Brief, halt — priority is human territory; algorithm proposes, human accepts.)* **Human Answer:** _Waiting_

- **AI Question 4 — Spike artifact location:** Wiki topic page (`wiki/topics/<slug>.md`, lightweight) or formal `SPIKE-NNN.md` in pending-sync (heavyweight, pushable)? *(Recommended: hybrid — wiki topic by default; promote to SPIKE-NNN.md only when (a) spike affects ≥2 stories OR (b) spike budget exceeds 2h OR (c) findings warrant PM-tool visibility.)* **Human Answer:** _Waiting_

- **AI Question 5 — Story complexity field:** Does the story template already have an L1–L4 (or T-shirt size) complexity field, or is this net-new? Need to read `.cleargate/templates/story.md`. If net-new, what's the migration story for the ~150 archived stories without it? *(Recommended: if net-new, stamp L2 default for archived rows; require explicit choice for new stories; doctor flags missing field as drift.)* **Human Answer:** _Waiting_

- **AI Question 6 — Conflict-graph scope:** Should the shared-file scan consider only source-tree files (`src/**`, `mcp/**`, `admin/**`), or also `.cleargate/` artifacts (templates, knowledge docs, sprint plans)? *(Recommended: source-tree as hard conflict; `.cleargate/` files as advisory soft conflict — Architect can override soft conflicts trivially since prose edits rarely race-condition.)* **Human Answer:** _Waiting_

- **AI Question 7 — Cross-sprint dependency check enforcement:** Hard block in v2 (refuses to schedule), or warn-and-allow in v1? *(Recommended: hard block in v2, warn in v1 — same envelope as drift detection.)* **Human Answer:** _Waiting_

- **AI Question 8 — Parallelism cap default:** Empirical 4? Lower (3) for safety, higher (5) for ambitious sprints? *(Recommended: 4 default, configurable per sprint. Reasoning: SPRINT-26..30 audit shows 4 is the merge-conflict knee; 5 doubles the conflict rate without doubling throughput.)* **Human Answer:** _Waiting_

- **AI Question 9 — Algorithm vs. Architect SDR precedence:** When `sprint plan --auto` and Architect SDR disagree, who wins? *(Recommended: Architect override wins but must record rationale in §2.5; algorithm is the floor, judgment is the ceiling. Mirrors auto-memory `feedback_dispatch_vs_milestone_plan_precedence.md` for Dev/Architect precedence.)* **Human Answer:** _Waiting_

- **AI Question 10 — Sprint scope for delivery:** Single sprint (one M-plan, 4–6 stories), or two sprints (M1 = backlog/capacity/grooming; M2 = drift/spike)? Recommend split since drift bounding requires CR-071 (autonomy contract) to ship first. *(Recommended: 2 milestones in 1 sprint OR 2 sprints back-to-back. Milestone 1 ships grooming + conflict-graph + capacity in ~5 stories; Milestone 2 ships drift detection + spike runner + skill in ~5 stories. Sequenced because drift validation depends on autonomy mode being stable.)* **Human Answer:** _Waiting_

- **AI Question 11 — `cleargate spike` UX:** Is `cleargate spike <story-id>` the right command shape, or should spikes be triggered exclusively via the spike-execution skill (conversational, no CLI)? *(Recommended: both — CLI for explicit invocation + scriptability; skill for conversational "I need to spike this".)* **Human Answer:** _Waiting_

- **AI Question 12 — Spike findings indexing:** Should `.cleargate/wiki/topics/<slug>.md` get a tag like `kind: spike-finding` for downstream filtering, or stay as a generic topic page? *(Recommended: add `kind: spike-finding` + `unblocked_stories: [...]` frontmatter — preserves Karpathy compounding loop but enables targeted query.)* **Human Answer:** _Waiting_

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true`. *(N/A — proposal gate waived per `feedback_proposal_gate_waiver.md`; waiver recorded in `context_source`.)*
- [x] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths. *(Unverified: existence of `cleargate-cli/src/commands/doctor.ts`, story complexity field current state, exact path of session-start hook. Will verify before flipping to 🟢.)*
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec). *(12 open questions pending.)*
- [ ] 0 "TBDs" exist in the document. *(`target_date: "TBD"` pending Q10 answer.)*
- [x] §3.5 Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] §3.6 Why not simpler? has both sub-bullets answered.
