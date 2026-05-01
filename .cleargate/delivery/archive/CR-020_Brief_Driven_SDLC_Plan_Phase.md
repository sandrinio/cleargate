---
cr_id: CR-020
parent_ref: cleargate-protocol.md (Plan-phase semantics + gate model)
parent_cleargate_id: "cleargate-protocol.md (Plan-phase semantics + gate model)"
sprint_cleargate_id: SPRINT-17
carry_over: false
status: Done
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: ".cleargate/scratch/SDLC_brainstorm.md (de-facto charter — Option A per 2026-05-01 conversation). Trigger: SDLC redesign discussion 2026-04-30 → 2026-05-01. Decisions locked: §1 Settled (universal Brief pattern, 4-gate model, 5-phase SDLC, MCP-only sync); §2 Open / §6 Working notes (CR-split rationale: option 2 — CR-020 Plan-phase, CR-021 Prepare/Close/Observe). Verbatim user approval: 'go for option a'. Gate 1 (Brief) waived — sharp intent + inline references in source conversation."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T20:00:00Z
  reason: Direct approval of Option A (no Initiative umbrella; brainstorm + child Epic/CRs as the structure). Sharp intent — user said 'go for option a' after reviewing three structural options with full trade-off table.
owner: sandrinio
target_date: SPRINT-17
created_at: 2026-05-01T20:00:00Z
updated_at: 2026-05-01T20:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T08:33:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-020
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T08:33:21Z
  sessions: []
---

# CR-020: Brief-Driven SDLC — Plan Phase + Unified Gate Model

**Wave dependency:** SPRINT-17, lands **after** EPIC-024 stories (024-01 / 024-02 / 024-03) merge. Reasons:
- §0 Phase Map (this CR) inserts into the slim `cleargate-protocol.md` produced by STORY-024-02.
- The 4-bullet block in CLAUDE.md (STORY-024-03) is replaced by a richer Brief-driven instruction set under this CR — clean ordering avoids merge churn.
- §-citation rewrite from STORY-024-02 must be complete before this CR amends §2/§3/§4.

## 1. The Context Override

### 1.1 What to remove / forget

The conversational orchestrator and every drafting agent currently follow **three rules that this CR retires**:

1. **"Always Start with a Proposal" mandate** (current `cleargate-protocol.md` §2 + §3 + §4 Gate 1). Every Epic/Story/CR draft today requires a parent `Proposal` with `approved: true` before any drafting may begin. The rule has been waived informally for ~30% of work items in 2026 (via saved-memory pattern + `proposal_gate_waiver` frontmatter); the steady state is the workaround, not the rule.
2. **Gate 1 (Proposal Approval) and Gate 2 (Per-Doc Ambiguity) as separate steps**. They fire at different points but require the same artifact (a clarification pass with human signoff). Two gates, one decision moment — collapse to one.
3. **Gate 3 (Push) as a separate human-confirmation moment**. When a Brief reaches 🟢, the human has already confirmed the work is clear and ready to proceed. Asking again "now confirm the push" is redundant ceremony — the same approval covers both.

### 1.2 The new truth (post-CR)

1. **Universal Brief pattern.** Every template that produces a *human-consumed* document carries an `<instructions>` block specifying: WHAT to gather, HOW to gather it, ANALYSIS the agent must perform, WHERE to write, and the post-write **Brief shape** (Summary / Open Questions / Edge Cases / Risks / Ambiguity). The agent reads the template, drafts the document, presents the Brief in chat, halts for human review. Conversation resolves open questions → ambiguity flips 🔴 → 🟢 → **Gate 1 (Brief)** passes. The same approval *implicitly grants the MCP push* — agent proceeds to call `cleargate_push_item` immediately.
2. **AI-only-consumed documents skip the Brief.** Milestone plans (`plans/M<N>.md`), dispatch markers, `state.json`. No human review → no presentation layer.
3. **Proposal becomes optional.** Triage classifies the user's request directly into Epic / Story / CR / Bug / Hotfix; agent drafts the appropriate template; presents Brief. **Proposal template is retained for Initiative-class scope only** (multi-Epic, file-persisted Brief). For everything else, no Proposal step.
4. **Four numbered gates, no decimals:**
   - **Gate 1 — Brief** (per work item, Plan phase): clarification 🔴→🟢 + implicit MCP push approval
   - **Gate 2 — Sprint Ready** (per sprint, Prepare phase): plan quality (decomposed + 🟢 + SDR §2 written) — covered in CR-021
   - **Gate 3 — Sprint Execution** (per sprint, Prepare→Execute boundary): environment health — covered in CR-021
   - **Gate 4 — Close-Ack** (per sprint, Close phase): replaces old Gate 3.5; CR-019 semantics unchanged
5. **Five-phase SDLC named explicitly** at top of slim `cleargate-protocol.md`: **Plan → Prepare → Execute → Observe → Close**. New §0 Phase Map (~30 lines) gives every AI agent the whole SDLC shape in one read.
6. **MCP is the PM tool from the AI's perspective.** Protocol prose drops Linear/Jira/GitHub-Issues mentions. The `cleargate_*` MCP surface (`pull_initiative`, `push_item`, `sync_status`) is the only sync interface; whatever upstream fan-out exists is MCP's concern, invisible to the AI.

## 2. Blast Radius & Invalidation

### 2.1 Documents directly modified

| Surface | What changes |
|---|---|
| `.cleargate/knowledge/cleargate-protocol.md` (slim, post-EPIC-024) | Insert new §0 Phase Map (~30 lines). Rewrite §2 Front Gate (drop "Always Start with a Proposal"). Rewrite §3 Hierarchy Rules (drop "Proposal before everything"; clarify Initiative scope). Rewrite §4 Phase Gates with the four-gate model. Rewrite §5 Delivery Workflow (Brief → halt → push collapses). Rewrite §6 MCP Tools (drop Linear/Jira mentions; reframe as universal sync surface). |
| `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` | Identical mirror edit |
| `.cleargate/templates/proposal.md` | Reframe `<instructions>` for Initiative-only scope. Add Brief instruction. Drop the "CRITICAL PHASE GATE: Do NOT generate Epics or Stories" block — that mandate retires. |
| `.cleargate/templates/epic.md` | Add Brief presentation instruction in `<instructions>` block. Remove "MUST link to approved proposal.md" from `context_source:` field's required-content rule. |
| `.cleargate/templates/story.md` | Add Brief presentation instruction. **Add new §1.4 Open Questions section** + **new §1.5 Risks section** (current Story template lacks both — TBDs scattered, risks ad hoc). |
| `.cleargate/templates/CR.md` | Add Brief presentation instruction. Audit §1–§4 — the 4-section structure already covers Brief slots conceptually, just needs explicit instruction. |
| `.cleargate/templates/Bug.md` | Add Brief presentation instruction. Audit. |
| `.cleargate/templates/hotfix.md` | Add Brief presentation instruction. Audit. |
| All 6 work-item templates' frontmatter | **Drop `proposal_gate_waiver` field** — workaround retires with the mandate. |
| `CLAUDE.md` (CLEARGATE-tag-block region only) | Replace the 4-bullet block STORY-024-03 added with the richer Brief-driven instruction set. Keep STORY-024-03's read-order tier 4 (`cleargate-enforcement.md`). |
| `cleargate-planning/CLAUDE.md` | Identical mirror edit |

### 2.2 Documents reverted to 🔴 by this CR

**None.** This CR changes the gate-name and Brief-presentation surface; it does not invalidate any existing Epic/Story/CR/Bug body. In-flight items (everything currently in `pending-sync/`) keep their existing ambiguity status. The `proposal_gate_waiver` frontmatter field gets removed across all templates, but artifacts that still carry it in their frontmatter are simply ignored — no migration needed.

### 2.3 Existing artifacts that gain a one-time field cleanup

EPIC-024 and CR-020 (this file) both carry `proposal_gate_waiver:` in their frontmatter today. Once this CR ships, the field becomes inert. Cleanup is opt-in:
- Live frontmatter (`pending-sync/`): **remove** the field as part of the next commit touching each file
- Archive frontmatter (per §11.4 immutability): **leave intact** — historical record of the waiver pattern

### 2.4 No CLI surface changes

This CR is doc-only. The MCP push functions (`cleargate_push_item`, etc.) keep their existing `approved: true` precondition unchanged at the tool level — that stays as defense-in-depth, just no longer surfaced as a separate human-facing gate.

## 3. Execution Sandbox

> **v2 file-surface contract.** Every file staged in this CR's commits must appear below or be covered by `.cleargate/scripts/surface-whitelist.txt`. This CR does not require §3.1 self-amendment because the file list is enumerable up-front.

### 3.1 Files modified (live + canonical mirror pairs unless noted)

**Protocol (post-EPIC-024 slim):**
- `.cleargate/knowledge/cleargate-protocol.md`
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`

**Templates:**
- `.cleargate/templates/proposal.md`
- `.cleargate/templates/epic.md`
- `.cleargate/templates/story.md`
- `.cleargate/templates/CR.md`
- `.cleargate/templates/Bug.md`
- `.cleargate/templates/hotfix.md`
- `cleargate-planning/.cleargate/templates/proposal.md`
- `cleargate-planning/.cleargate/templates/epic.md`
- `cleargate-planning/.cleargate/templates/story.md`
- `cleargate-planning/.cleargate/templates/CR.md`
- `cleargate-planning/.cleargate/templates/Bug.md`
- `cleargate-planning/.cleargate/templates/hotfix.md`

**Brain files:**
- `CLAUDE.md` (CLEARGATE-tag-block region only)
- `cleargate-planning/CLAUDE.md` (CLEARGATE-tag-block region only)

**Total:** 16 files (8 file pairs, all mirrored).

### 3.2 Edit blueprint per surface

#### 3.2.1 Protocol §0 Phase Map (new — insert at top)

Add a new §0 between the H1 title and the current §1 Your Role:

```markdown
## 0. The Five Phases

ClearGate operates in five named phases. Every work item moves through them in order; every gate fires at a phase boundary.

| Phase | Activity | Gate at exit |
|---|---|---|
| **Plan** | Triage user request → draft work item using template → present Brief → resolve open questions → ambiguity 🟢 | **Gate 1 — Brief** (per work item; implicitly grants MCP push) |
| **Prepare** | Sprint planning. AI auto-picks sprint number, drafts Sprint Plan as Brief, Architect writes §2 Sprint Design Review. | **Gate 2 — Sprint Ready** (plan quality) → **Gate 3 — Sprint Execution** (env health) |
| **Execute** | Four-agent loop: Architect (per-milestone plan) → Developer → QA → (Reporter at end). One story = one worktree = one commit. | (transitions to Observe when all stories merge to sprint branch) |
| **Observe** | User walkthrough on sprint branch. Feedback classified `UR:bug` or `UR:review-feedback`. Bugs fixed before merge to main. | (transitions to Close when all `UR:bug` resolved) |
| **Close** | Lifecycle reconciler → Reporter writes `SPRINT-<#>_REPORT.md` → status flips Completed. | **Gate 4 — Close-Ack** |

Read this section first. Drill into §1–§14 + §21 only as needed for the current task.
```

#### 3.2.2 Protocol §2 Front Gate rewrite

Drop the "Always Start with a Proposal" subsection. Replace with:

```markdown
### Always Start with a Brief

Every drafted work item — Epic, Story, CR, Bug, Hotfix — gets a Brief presented to the human in chat after the document is written. The Brief is mechanically extracted from the document's own sections per the template's `<instructions>` block (Summary / Open Questions / Edge Cases / Risks / Ambiguity). Conversation resolves open questions; ambiguity flips 🔴 → 🟢 → **Gate 1 passes**.

**No Proposal step is required.** The Proposal template is retained only for **Initiative-class scope** — multi-Epic work where a persistent file-based Brief is genuinely useful before decomposition begins. For everything else (single Epic / Story / CR / Bug / Hotfix), the agent triages the request directly into the appropriate template and presents the Brief.
```

#### 3.2.3 Protocol §3 Hierarchy Rules rewrite

Replace the "Hierarchy Rules" subsection with:

```markdown
### Hierarchy Rules

- **No orphans.** Every Story has a `parent_epic_ref:` pointing to a real Epic file. Every Bug or CR references the affected Epic, Story, or knowledge document.
- **Epic before Story.** A Story file cannot exist without a `parent_epic_ref:` to a 🟢 Epic.
- **Initiative is optional.** A multi-Epic Initiative MAY exist as a file-persisted Brief in `pending-sync/INITIATIVE-NNN_*.md`. It is not required for any single-Epic-or-smaller work.
- **Cascade ambiguity.** A CR that invalidates an existing Epic or Story flips that document back to 🔴; downstream items inherit.
```

#### 3.2.4 Protocol §4 Phase Gates rewrite (the heart of the change)

Replace the current Gate 1 / Gate 2 / Gate 3 / "Gate 2 (Ambiguity) is machine-checked" enumeration with:

```markdown
## 4. The Four Gates

### Gate 1 — Brief (per work item, Plan phase)

After drafting any work item, the agent presents a Brief in chat:
- **Summary** (1–2 sentences from §1 / User Story)
- **Open Questions** (with recommended answers)
- **Edge Cases** (with recommended handling)
- **Risks** (with recommended mitigations)
- **Ambiguity level** (current 🔴 / 🟡 / 🟢)

Conversation resolves the open questions. When all are resolved → ambiguity flips 🟢 → Gate 1 passes. **The same approval implicitly grants the MCP push** — agent calls `cleargate_push_item` immediately. No separate "now confirm the push" step.

### Gate 2 — Sprint Ready (per sprint, Prepare phase internal)

Sprint Plan moves Draft → Ready when (a) every referenced item is decomposed + 🟢, (b) the sprint-level Brief is resolved, (c) the Architect Sprint Design Review (§2 of the Sprint Plan) is written under `execution_mode: v2`. Without all three, the sprint cannot transition.

### Gate 3 — Sprint Execution (per sprint, Prepare → Execute boundary)

Before sprint execution begins, the environment is checked. See `cleargate-enforcement.md` §<N> for full enforcement spec; specified by CR-021.

### Gate 4 — Close-Ack (per sprint, Close phase)

`close_sprint.mjs` halts at Step 5 with the prompt "Review the report, then confirm close by re-running with --assume-ack." Orchestrator surfaces the prompt verbatim and halts. Human reads the sprint report, then either re-runs the script with `--assume-ack` themselves or explicitly tells the orchestrator "approved, close it" — at which point the orchestrator may pass the flag.

`--assume-ack` is reserved for **automated test environments only**. Conversational orchestrators MUST NOT pass it autonomously. Violation is a Gate-4 breach equivalent to an unauthorized push.
```

(Remove the old "v2 enforcement rule" + "v2 story-file assertion" subsections from §4 — they belong in `cleargate-enforcement.md` per EPIC-024's split.)

#### 3.2.5 Protocol §5 Delivery Workflow simplification

Replace the 5-step DRAFT → HALT → SYNC → COMMIT → ARCHIVE block with a 4-step:

```markdown
1. DRAFT — Fill the appropriate template. Save to `.cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md`.
2. BRIEF — Present the Brief in chat. Halt for human review. Resolve open questions.
3. SYNC — When ambiguity flips 🟢, call `cleargate_push_item` automatically (Gate 1 covers approval).
4. ARCHIVE — Inject returned remote ID into frontmatter; move file to `.cleargate/delivery/archive/`.
```

#### 3.2.6 Protocol §6 MCP Tools reframe

Replace "Only use the `cleargate_*` MCP tools to communicate with PM tools. Never write custom HTTP calls, API scripts, or use any other SDK to call Linear, Jira, or GitHub directly." with:

```markdown
**MCP is the only sync surface.** From the AI's perspective, MCP *is* the PM tool. The `cleargate_*` MCP tools (`cleargate_pull_initiative`, `cleargate_push_item`, `cleargate_sync_status`, plus the work-item / sync-log surface added in SPRINT-16) are the only interfaces. Whatever upstream systems MCP fans out to (Linear / Jira / GitHub Issues / others) is MCP's concern, not yours. Never write custom HTTP calls, API scripts, or other SDK invocations.
```

#### 3.2.7 Templates: per-template `<instructions>` Brief block

Each work-item template gains a uniform appendix in its `<instructions>` block:

```
POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Summary       ← <SECTION-MAP per template>
  - Open Questions ← <SECTION-MAP per template>
  - Edge Cases    ← <SECTION-MAP per template>
  - Risks         ← <SECTION-MAP per template>
  - Ambiguity     ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.
```

Per-template SECTION-MAP:

| Template | Summary | Open Questions | Edge Cases | Risks |
|---|---|---|---|---|
| proposal.md (Initiative-only) | §1 Initiative & Context | (new — add §1.4 Open Questions) | (new — add §3.3 Edge Cases) | §2 Constraints |
| epic.md | §1 Problem & Value | §6 AI Interrogation Loop | §2 Scope Boundaries (OUT-OF-SCOPE list) + §5 Acceptance error scenarios | §3 Reality Check |
| story.md | §1.1 User Story | **(new) §1.4 Open Questions** | §2.1 Gherkin error scenarios | **(new) §1.5 Risks** |
| CR.md | §1 Context Override | (new — add §0.5 Open Questions) | §2 Blast Radius | §2 Blast Radius (downstream invalidation = risk) |
| Bug.md | §1 The Bug (repro) | (new — add §0.5 Open Questions) | §2 Impact (edge conditions) | §2 Impact |
| hotfix.md | §1 Problem | (new — add §0.5 Open Questions) | §3 Files Affected | §4 Verification + risk-of-missing |

#### 3.2.8 Story template gap-close (new sections)

Add to `templates/story.md` between current §1.3 Out of Scope and §2 The Truth:

```markdown
### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** {edge case, contradiction, or missing detail surfaced during drafting}
- **Recommended:** {agent's proposed answer}
- **Human decision:** {populated during Brief review}

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** {what could go wrong}
- **Mitigation:** {agent's proposed mitigation}
```

#### 3.2.9 Drop `proposal_gate_waiver` from all templates

Remove the field from frontmatter examples in:
- `proposal.md` (it never had it; verify)
- `epic.md`
- `story.md`
- `CR.md`
- `Bug.md`
- `hotfix.md`
- All canonical mirrors

#### 3.2.10 CLAUDE.md replacement of the 4-bullet block (STORY-024-03's output)

STORY-024-03 added 4 bullets surfacing the previously-implicit rules. Under CR-020, those 4 bullets are *retained but expanded* with the Brief-driven flow. The replacement 6-bullet block, inserted in the same location:

```markdown
**Sprint mode.** Read `execution_mode:` in the active sprint's frontmatter before spawning Developer/QA. `v1` = advisory; `v2` = enforce the rules in `cleargate-enforcement.md`. Default `v1`.

**Brief is the universal pre-push handshake.** Every work-item template's `<instructions>` block tells you to render a Brief in chat after Writing the document — Summary / Open Questions / Edge Cases / Risks / Ambiguity. Halt for human review. When ambiguity reaches 🟢, push via `cleargate_push_item` automatically — the same approval covers Gate 1 and the push.

**Architect runs twice per sprint.** (1) Sprint Design Review writes §2 of the sprint plan before human confirm. (2) Per-milestone plan writes `sprint-runs/<id>/plans/M<N>.md` before Developer agents start that milestone.

**Boundary gates (CR-017).** `cleargate sprint init` runs the decomposition gate; `close_sprint.mjs` runs the lifecycle reconciler. Both block in v2.

**Sprint Execution Gate (CR-021).** Before transitioning Ready → Active, the environment must pass: previous sprint Completed, no leftover worktrees, `sprint/S-NN` ref free, `main` clean. See `cleargate sprint preflight`.

**Sprint close is Gate-4-class (CR-019).** Run `close_sprint.mjs` with no flags first; surface the prompt verbatim; halt. Never pass `--assume-ack` autonomously.
```

### 3.3 Order of edits (Architect milestone plan should reflect)

1. **Wave 1** (depends on EPIC-024 STORY-024-02 merge): protocol §0 Phase Map + §2 + §3 + §4 + §5 + §6 rewrites.
2. **Wave 2** (parallel): six template `<instructions>` updates + Story §1.4/§1.5 additions + `proposal_gate_waiver` field removal.
3. **Wave 3** (depends on Wave 1 + EPIC-024 STORY-024-03 merge): CLAUDE.md replacement of the 4-bullet block.
4. All edits applied to canonical mirrors in lockstep.

## 4. Verification Protocol

### 4.1 Gherkin acceptance scenarios

```gherkin
Feature: Brief-driven SDLC — Plan phase + four-gate model

  Scenario: §0 Phase Map present at top of slim protocol
    Given CR-020 has merged
    When .cleargate/knowledge/cleargate-protocol.md is read
    Then the file contains "## 0. The Five Phases" before "## 1. Your Role"
    And §0 lists exactly five phases: Plan, Prepare, Execute, Observe, Close
    And §0 maps each phase to its exit gate (Gate 1 / Gate 2 + Gate 3 / no-gate / no-gate / Gate 4)

  Scenario: "Always Start with a Proposal" mandate retired
    Given CR-020 has merged
    When .cleargate/knowledge/cleargate-protocol.md is grepped
    Then it contains "Always Start with a Brief"
    And it does NOT contain "Always Start with a Proposal"
    And §3 Hierarchy Rules contains "Initiative is optional" and does NOT contain "Proposal before everything"

  Scenario: Four numbered gates, no decimals
    Given CR-020 has merged
    When §4 of cleargate-protocol.md is read
    Then it contains exactly four gate headings: "Gate 1 — Brief", "Gate 2 — Sprint Ready", "Gate 3 — Sprint Execution", "Gate 4 — Close-Ack"
    And it does NOT contain "Gate 3.5"
    And Gate 1 prose explicitly states that Brief approval implicitly grants the MCP push

  Scenario: Six work-item templates carry the Brief instruction
    Given CR-020 has merged
    When the <instructions> block of each of {proposal.md, epic.md, story.md, CR.md, Bug.md, hotfix.md} is read
    Then each contains a "POST-WRITE BRIEF" section
    And each declares the SECTION-MAP for Summary / Open Questions / Edge Cases / Risks / Ambiguity

  Scenario: Story template gains §1.4 Open Questions and §1.5 Risks
    Given CR-020 has merged
    When .cleargate/templates/story.md is read
    Then it contains a "### 1.4 Open Questions" heading
    And it contains a "### 1.5 Risks" heading
    And both new sections appear between current §1.3 Out of Scope and §2 The Truth

  Scenario: proposal_gate_waiver field dropped from all templates
    Given CR-020 has merged
    When `grep -l "proposal_gate_waiver" .cleargate/templates/ cleargate-planning/.cleargate/templates/` runs
    Then it returns zero matches
    # Existing pending-sync/ artifacts that still carry the field are not migrated; they're inert

  Scenario: MCP-only sync — Linear/Jira mentions removed
    Given CR-020 has merged
    When `grep -iE "linear|jira|github issues" .cleargate/knowledge/cleargate-protocol.md` runs
    Then it returns zero matches in §6 MCP Tools and §5 Delivery Workflow
    # Mentions in §14 Multi-Participant Sync historical context may remain if load-bearing

  Scenario: Mirror parity invariant
    Given CR-020 has merged
    When `diff` runs on each live/canonical pair (protocol + 6 templates + CLAUDE.md CLEARGATE-block)
    Then every diff returns empty (or for CLAUDE.md, the CLEARGATE-tag-block region is byte-identical)

  Scenario: No regression
    Given CR-020 has merged
    When `cleargate doctor`, `cleargate wiki lint`, `node .cleargate/scripts/state-scripts.test.mjs`, and `node .cleargate/scripts/test_ratchet.mjs` run
    Then all four exit 0

  Scenario: No accidental gate-semantic change at the code level
    Given CR-020 has merged
    When the gate-enforcement code paths in cleargate-cli/src/ and mcp/src/ are diffed against the pre-CR baseline
    Then those code paths are byte-identical (this CR is doc-only)

  Scenario: CLAUDE.md retains tier-4 read-order entry from STORY-024-03
    Given CR-020 has merged
    When the session-start orientation block of CLAUDE.md is read
    Then the numbered list still contains a tier-4 entry referencing cleargate-enforcement.md
    And the 4-bullet block from STORY-024-03 has been replaced by the 6-bullet block defined in §3.2.10
```

### 4.2 Manual verification steps

- [ ] Read slim `cleargate-protocol.md` end-to-end. Verify §0 → §14 → §21 numbering. Verify gates match the 4-gate model.
- [ ] Read each of the 6 work-item templates. Confirm `<instructions>` block contains the POST-WRITE BRIEF section + correct SECTION-MAP.
- [ ] Open `.cleargate/templates/story.md` — confirm §1.4 + §1.5 render correctly.
- [ ] Read CLAUDE.md CLEARGATE-tag-block region — confirm 6 bullets in correct order, including the one from CR-021 (Sprint Execution Gate forward-reference).
- [ ] Run `diff` on each live/canonical pair — empty output.
- [ ] Run `cleargate doctor` — exits 0.
- [ ] Run `cleargate wiki lint` — exits 0.
- [ ] Spawn a mock drafting flow against the new templates: triage a hypothetical user request, draft an Epic, verify the agent surfaces a Brief matching the SECTION-MAP.

### 4.3 Definition of Done

- [ ] All §4.1 Gherkin scenarios pass.
- [ ] Mirror diff empty for all 8 file pairs.
- [ ] No regression on existing tests (doctor, wiki lint, state-scripts, test_ratchet).
- [ ] No code-level gate-enforcement changes (this CR is doc-only).
- [ ] EPIC-024 Wave 1 + Wave 2 stories merged before this CR's commits land.
- [ ] STORY-024-03's CLAUDE.md edit is cleanly replaced by §3.2.10's 6-bullet block (not duplicated).
- [ ] Architect (gate review) approves.
- [ ] Commit message format: `feat(EPIC-protocol): CR-020 Brief-driven SDLC — Plan phase + 4-gate model` (single commit; this CR does not decompose into stories).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Approved Proposal exists (waived per `proposal_gate_waiver` frontmatter — saved-memory pattern + brainstorm Option A confirmed by user 2026-05-01).
- [x] §3 Execution Sandbox lists every file path explicitly (16 files, 8 mirror pairs).
- [x] Downstream invalidation analysis complete (§2.2: zero items reverted to 🔴; in-flight artifacts unaffected).
- [x] Verification Protocol (§4) covers every behavior change (10 Gherkin scenarios + 8 manual steps).
- [x] No "TBDs" remain.
