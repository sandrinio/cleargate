<instructions>
This template is actively authored during the Prepare phase.

WHAT TO GATHER
  - Sprint number — read .cleargate/wiki/active-sprint.md, scan pending-sync/SPRINT-*.md, emit max(N) + 1
  - Available work items — pending-sync/{EPIC,STORY,CR,BUG,HOTFIX}-*.md filtered ambiguity:🟢 + status:Ready
  - Human-set priorities — frontmatter `priority` field per item
  - Cross-item dependencies — `parent_epic_ref:` + shared file-surface analysis

HOW TO GATHER
  - Read for sprint-runs/, Grep for pending-sync/, scripts/wiki-query for awareness layer
  - cleargate-cli/src/lib/admin-url.ts for any admin-link references

ANALYSIS REQUIRED
  - Propose priority reordering for technical reasons (dep chains, shared-surface conflicts, fast-lane bundling). One-line rationale per change.
  - Flag missing decomposition (epics with no child stories) — must resolve before Gate 2 passes.
  - Trigger Architect Sprint Design Review (writes §2 Execution Strategy) once scope is locked.

WHERE TO WRITE
  - .cleargate/delivery/pending-sync/SPRINT-<#>_<name>.md

POST-WRITE BRIEF
  Render in chat with these sections:
    - Sprint Goal (1 sentence)
    - Selected items (table: id / type / lane / milestone / parallel? / bounce-exposure)
    - Recommended priority changes (with one-line rationale per change)
    - Open questions for human (with recommended answers)
    - Risks (with mitigations)
    - Current ambiguity + Gate 2 readiness checklist (decomposed? all 🟢? SDR §2 written?)
  Halt for human review. When ambiguity reaches 🟢 AND Gate 2 conditions satisfy, proceed to call cleargate_push_item.

DUAL-AUDIENCE STRUCTURE
  Top of body: Stakeholder/Sponsor view (Sprint Goal, Business Outcome, Risks/Mitigations, Metrics).
  Bottom of body: AI-execution view (Phase Plan, Merge Ordering, Lane Audit, ADR-Conflict Flags, Decomposition Status).

Do NOT output these instructions.
</instructions>

---
sprint_id: "SPRINT-{ID}"
parent_cleargate_id: null  # canonical cleargate-id of parent work item; null for top-level
sprint_cleargate_id: null  # canonical cleargate-id of owning sprint; null for off-sprint items
carry_over: false  # set true to skip lifecycle reconciliation at sprint close
lifecycle_init_mode: "warn"  # "warn" | "block" — controls sprint-init lifecycle gate (§10.4); use "block" for SPRINT-16+
remote_id: "{PM_TOOL_SPRINT_ID}"
source_tool: "linear | jira"
status: "Draft | Active | Completed"
execution_mode: "v1"   # Enum: "v1" | "v2". Default "v1". Under "v2", §§1–18 of cleargate-enforcement.md are enforcing (worktree isolation, pre-gate scanning, bounce counters, flashcard gate, sprint-close pipeline). Under "v1", those sections are advisory only and all new CLI commands (sprint init|close, story start|complete, gate qa|arch, state update|validate) print an inert-mode message. Set to "v2" only after all EPIC-013 M2 stories have shipped and the Architect has completed a Sprint Design Review (see §5 of the protocol).
start_date: "{YYYY-MM-DD}"
end_date: "{YYYY-MM-DD}"
synced_at: "{ISO-8601 timestamp}"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
---

# SPRINT-{ID}: {Sprint Number / Name}

## 0. Stakeholder Brief
*(Sponsor-readable summary. Pushed to PM tool. Pair with §3 Risks below.)*

- **Sprint Goal:** {1 sentence}
- **Business Outcome:** {what the user / sponsor gets}
- **Risks (top 3):** {bullet list, see §3 for full table}
- **Metrics:** {expected impact / KPIs}

## Sprint Goal
{One clear sentence describing the primary objective of this sprint, as defined in the PM tool.}

## 1. Consolidated Deliverables
*(Pulled from PM tool. IDs are the remote PM entity IDs.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `{STORY-NNN-NN}` | {Title} | standard / fast | M{N} | y / n | low / med / high |

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review. Required before `execution_mode: v2` sprint start. Under v1, this section may be omitted or left as a stub.)*

### 2.1 Phase Plan
{Parallel vs sequential story groups. List which stories run concurrently in each wave and which must be serialized.}
Example:
- Wave 1 (sequential): STORY-NNN-01 → STORY-NNN-02 (02 depends on 01's schema)
- Wave 2 (parallel): STORY-NNN-03 ‖ STORY-NNN-04

### 2.2 Merge Ordering (Shared-File Surface Analysis)
{List files touched by more than one story. For each shared file, specify which story lands first and why.}

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `.cleargate/knowledge/cleargate-enforcement.md` | STORY-NNN-01, STORY-NNN-02 | 01 → 02 | 01 adds §2; 02 amends §2 |

### 2.3 Shared-Surface Warnings
{Explicit conflict risks. One bullet per risk. Cite file + story pair.}
- None identified. (Replace with actual warnings if applicable.)

### 2.4 Lane Audit
{Architect populates one row per fast-lane story during Sprint Design Review. Empty by default — rows added only for non-`standard` lanes.}

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `STORY-NNN-NN` | fast | <one-line rationale> |

### 2.5 ADR-Conflict Flags
{Any story whose implementation conflicts with an Architectural Decision Record in `.cleargate/knowledge/` or prior sprint decisions. One bullet per flag.}
- None identified. (Replace with actual flags if applicable.)

## Risks & Dependencies
*(As defined in the PM tool.)*

| Risk | Mitigation |
|---|---|
| {Description} | {Action} |

## Metrics & Metadata
- **Expected Impact:** {e.g., performance improvement %, specific user outcome}
- **Priority Alignment:** {Notes on prioritization from the PM tool}

---

## Execution Guidelines (Local Annotation — Not Pushed)
*(Vibe Coder: Fill this in locally to direct Claude Code during the Execution Phase. This section never syncs to the PM tool.)*

- **Starting Point:** {Which deliverable to tackle first and why}
- **Relevant Context:** {Key documentation or codebase areas to reference}
- **Constraints:** {Specific technical boundaries or "out of scope" rules for this sprint}
