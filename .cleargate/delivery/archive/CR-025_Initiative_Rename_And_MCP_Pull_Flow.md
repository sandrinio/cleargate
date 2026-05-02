---
cr_id: CR-025
parent_ref: cleargate-protocol.md §2-§4 (Proposal mandate, retired by CR-020); CR-020 (Brief-driven SDLC, SPRINT-17); SDLC brainstorm charter §2.1 + §2.5
parent_cleargate_id: "cleargate-protocol.md §2-§4 (Proposal mandate, retired by CR-020); CR-020 (Brief-driven SDLC, SPRINT-17); SDLC brainstorm charter §2.1 + §2.5"
sprint_cleargate_id: SPRINT-19
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: "SDLC brainstorm charter §2.1 left 'Proposal' rename as an open question; §2.5 confirmed phase + gate names. User 2026-05-01 closed the question: 'i agree to rename proposal to initiative. it should have its own template. the vibe coder should write all work items (artifacts) in the codebase with AI agent. Initiative can be written outside the codebase. It should capture what BA/PM is requesting. User flow, diagrams, e2e (verbally) and etc.' Plus 'Initiative will probably come from MCP pull.' Splits the SDLC into a pre-Plan stakeholder layer (Initiative, BA/PM territory, no AI authoring) and the in-codebase AI-driven layer (Epic / Story / CR / Bug / Hotfix). PROPOSAL-008 + PROPOSAL-009 are archived as part of this CR (no special handling)."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T22:30:00Z
  reason: Direct approval pattern. Charter §2.1 + §2.5 already discussed; user explicit ack 2026-05-01. No new design decisions; CR maps 1:1 to a clear rename + MCP-pull flow definition.
approved: true
owner: sandrinio
target_date: SPRINT-19
created_at: 2026-05-01T22:30:00Z
updated_at: 2026-05-01T22:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T18:11:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-025
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T18:11:31Z
  sessions: []
---

# CR-025: Initiative Rename + Outside-Repo Authoring + MCP Pull Flow

**Lane:** `standard` — 3 stories, ~150 LOC across templates + protocol + agent prompts. Affects every future Plan-phase intake.

## 0.5 Open Questions

- **Question:** Initiative file naming convention.
  **Recommended:** `INITIATIVE-NNN_short_name.md` parallel to `EPIC-NNN_*.md`. Three-digit zero-padded ID; underscore-separated suffix. Same triage / archive flow as Epic.
  **Human decision:** _accept recommended_

- **Question:** Existing `proposal.md` template — delete entirely, or keep as deprecated alias for backwards-compat?
  **Recommended:** **Delete entirely.** CR-020 already retired the Proposal mandate at the protocol level. No live work-item references it. Template removal in this CR is the natural follow-through. Archive lookups remain unaffected (archive files keep their `proposal_gate_waiver` field; CR-025 only drops it from new templates).
  **Human decision:** _accept recommended_

- **Question:** Existing PROPOSAL-008 + PROPOSAL-009 in pending-sync — retro-convert to INITIATIVE, delete, or archive as legacy proposals?
  **Recommended:** **Archive as-is.** User 2026-05-01: "just archive them". Both files keep their `proposal_id` frontmatter for audit trail. No content rewrite. CR-025 includes the move-to-archive operation.
  **Human decision:** _accept recommended_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "Proposal" as a work-item type. Retire the term entirely from `cleargate-protocol.md`, `cleargate-enforcement.md`, CLAUDE.md, agent prompts, and the templates directory. Archive references stay intact (do not rewrite history).
- `templates/proposal.md` file. Delete (live + canonical mirror). Replace with `templates/initiative.md` as the canonical stakeholder-input template.
- Mental model: "AI authors a Proposal as the first artifact in the SDLC." Wrong under the new model. The first AI-authored artifact is an Epic (or CR / Bug / Hotfix / Story for direct triage).
- `proposal_gate_waiver:` frontmatter field — drop from all live templates. Archive files keep theirs.
- Any prose claiming Initiative is OPTIONAL or "only for multi-Epic Initiatives". Under the new model, Initiative is the **canonical stakeholder input shape**, regardless of size.

**New Logic (The New Truth):**

- **Initiative is the stakeholder-input artifact.** Authored by BA / PM / sponsor, not by the AI. Captures: user flow, diagrams, end-to-end verbal description, business outcome, success criteria, stakeholder asks. The AI never *writes* an Initiative from scratch in the repo.
- **Initiative lives outside the codebase OR is pulled in via MCP.** Two intake paths:
  1. **MCP pull (preferred):** `cleargate_pull_initiative` MCP tool fetches the Initiative from the upstream PM tool (Linear / Jira / GitHub Issues) → caches at `.cleargate/delivery/pending-sync/INITIATIVE-NNN_*.md`. The AI reads the cached copy during triage.
  2. **Manual paste:** human pastes / drops an Initiative markdown file into `pending-sync/`. AI stamps the frontmatter (`source: manual-paste`), then triages.
- **Triage flow:** AI reads the Initiative → asks open questions in chat → **decomposes** into Epic / Story / CR / Bug (whichever fits) and authors those as new work items in `pending-sync/`. The Initiative document itself is NOT modified beyond frontmatter stamping.
- **Post-triage:** Initiative moves to `archive/INITIATIVE-NNN_*.md` with frontmatter stamps `triaged_at: <ISO-8601>` + `spawned_items: [EPIC-NNN, STORY-NNN-NN, ...]`. Audit trail preserved in repo. PM tool retains the source of truth for the Initiative content itself.
- **Initiatives are never authored in repo from scratch.** The asymmetry: Epic / Story / CR / Bug / Hotfix get **pushed** (`cleargate_push_item`); Initiative gets **pulled** (`cleargate_pull_initiative`). One-way data flow per type.
- **`templates/initiative.md` is the BA/PM cheat sheet.** Documents what an Initiative should contain. Used by the upstream PM tool's template export OR as a markdown skeleton for manual-paste authors. Not used by the AI for authoring.

## 2. Blast Radius & Invalidation

- [x] Updates `.cleargate/templates/initiative.md` (live + canonical) — promote to canonical stakeholder-input template; clarify outside-codebase authoring; document MCP pull intake.
- [x] Deletes `.cleargate/templates/proposal.md` (live + canonical). Removes from MANIFEST.json (auto-regenerated by prebuild).
- [x] Updates `.cleargate/knowledge/cleargate-protocol.md` (live + canonical) — replace any remaining "Proposal" citations with "Initiative" (audit grep first; CR-020 cleaned most). Update §2 / §3 Plan-phase prose to reference Initiative as the stakeholder-input shape.
- [x] Updates `.cleargate/knowledge/cleargate-enforcement.md` (live + canonical) — same audit + replace.
- [x] Updates `CLAUDE.md` (live + canonical mirror in `cleargate-planning/CLAUDE.md`) — Triage section + drafting-work-items section.
- [x] Updates `.claude/agents/architect.md` + canonical — any "Proposal" references swap to "Initiative".
- [x] Updates remaining work-item templates (epic.md / story.md / CR.md / Bug.md / hotfix.md) — drop `proposal_gate_waiver:` field from frontmatter scaffolds. Archive items keep their copies (no rewrite).
- [x] Moves `PROPOSAL-008_*.md` + `PROPOSAL-009_*.md` from `pending-sync/` to `archive/` with `status: Archived` + `archived_at: <ISO-8601>` stamps. No content rewrite.
- [ ] No CLI surface change. `cleargate_pull_initiative` MCP tool already exists (per CLAUDE.md scan); this CR only documents the flow, doesn't add tooling.
- [ ] No schema/migration on state.json or sprint frontmatter.
- [ ] No test-file changes for runtime behavior. Doc-lint tests (per DoD §4.1) verify the post-edit content.

**Downstream invalidation:** None of the in-flight SPRINT-19 work items get blast-radius'd. CR-022 + CR-024 + BUG-024 (the other SPRINT-19 anchors) touch close-pipeline + QA + token-ledger surfaces — disjoint from Initiative / Plan-phase territory.

## 3. Execution Sandbox

**Three stories under this CR:**

### Story 1 — `templates/initiative.md` promotion + `proposal.md` deletion + frontmatter cleanup (~50 LOC)

**Modify / Create / Delete:**
- `.cleargate/templates/initiative.md` (live + canonical mirror) — rewrite as the canonical stakeholder-input template per §1 New Truth. Sections to include: User flow, Diagrams (placeholder), E2E verbal description, Business outcome, Success criteria, Open questions for AI triage.
- `.cleargate/templates/proposal.md` (live + canonical mirror) — DELETE.
- Drop `proposal_gate_waiver:` field from frontmatter in: `epic.md`, `story.md`, `CR.md`, `Bug.md`, `hotfix.md` (live + canonical mirrors of each).

### Story 2 — Protocol + agent prose audit + replace (~50 LOC)

**Modify:**
- `.cleargate/knowledge/cleargate-protocol.md` (live + canonical) — grep for `[Pp]roposal` outside the §11.4 archive-immutability carve-out and §1 history rows; replace with `Initiative` where contextually correct. CR-020 cleaned most; this is the residual sweep.
- `.cleargate/knowledge/cleargate-enforcement.md` (live + canonical) — same audit.
- `CLAUDE.md` (live + canonical) — update Triage section + drafting-work-items section to reference Initiative as the pulled / pasted stakeholder-input artifact.
- `.claude/agents/architect.md` (live + canonical) + `.claude/agents/reporter.md` (live + canonical) — same audit. **`developer.md` and `qa.md` are EXCLUDED from CR-025 S2 scope** — pre-grep at draft time (2026-05-01) confirmed zero `[Pp]roposal` hits in either file. CR-024 S2 owns those two files exclusively (Wave 2 disjointness preserved).

### Story 3 — MCP pull-flow documentation + PROPOSAL-008/009 archive (~30 LOC)

**Modify / Move:**
- `CLAUDE.md` (live + canonical) — add a 3-line section "Initiative Intake" describing the two paths (MCP pull → cached in pending-sync; manual paste). Cite `cleargate_pull_initiative` MCP tool.
- `.cleargate/knowledge/cleargate-protocol.md` (live + canonical) — add or update §2 (or wherever Plan-phase intake lives) with the post-triage flow: `pending-sync/INITIATIVE-NNN_*.md` → archive/ with `triaged_at` + `spawned_items` stamps.
- `git mv .cleargate/delivery/pending-sync/PROPOSAL-008_*.md → .cleargate/delivery/archive/`
- `git mv .cleargate/delivery/pending-sync/PROPOSAL-009_*.md → .cleargate/delivery/archive/`
- Stamp both archive files with `status: Archived`, `archived_at: <ISO-8601>`, `archive_reason: "CR-025 retired Proposal artifact type; legacy file preserved for audit"`.

## 4. Verification Protocol

### 4.1 Minimum Test Expectations

| Test type | Min count | Notes |
|---|---|---|
| Doc lint tests | 6 | One per Gherkin scenario in §4.3 below. Home: new `cleargate-cli/test/scripts/initiative-rename.test.ts` (mirrors the `enforcement-section-13.test.ts` pattern from STORY-025-06). |
| Manual verification | 3 | (a) `templates/initiative.md` reads as a stakeholder cheat sheet (not AI-authoring instructions). (b) `templates/proposal.md` does not exist post-CR. (c) `grep -rn '[Pp]roposal' .cleargate/knowledge/ CLAUDE.md .claude/agents/` returns zero hits outside §11.4 archive-immutability carve-out + §1 history rows. |

### 4.2 Definition of Done

- [ ] `templates/initiative.md` rewritten per §3 Story 1.
- [ ] `templates/proposal.md` deleted (live + canonical).
- [ ] `proposal_gate_waiver:` field removed from 5 work-item templates (live + canonical = 10 file edits).
- [ ] Protocol + enforcement.md + CLAUDE.md + 4 agent files audited and replaced (live + canonical = 14 file edits).
- [ ] PROPOSAL-008 + PROPOSAL-009 moved to archive/ with stamps.
- [ ] 6 doc lint tests in `initiative-rename.test.ts` all green.
- [ ] Mirror parity holds for all touched live↔canonical pairs.
- [ ] MANIFEST.json regenerated by prebuild (auto).
- [ ] Commit message for each story per its DoD §4.2 line.

### 4.3 Gherkin acceptance scenarios

```gherkin
Feature: Initiative rename + outside-repo authoring + MCP pull flow

  Scenario: templates/initiative.md is canonical stakeholder cheat sheet
    Given CR-025 has shipped
    When .cleargate/templates/initiative.md is read
    Then it documents User flow, Diagrams, E2E verbal description, Business outcome, Success criteria, Open questions
    And it does NOT prescribe AI-authoring instructions (no <instructions> WHAT-TO-GATHER block)

  Scenario: templates/proposal.md does not exist
    When `ls .cleargate/templates/proposal.md cleargate-planning/.cleargate/templates/proposal.md` runs
    Then both lookups return ENOENT (file absent)
    And MANIFEST.json does not list either path

  Scenario: proposal_gate_waiver removed from active templates
    When grep -E "^proposal_gate_waiver:" runs against .cleargate/templates/{epic,story,CR,Bug,hotfix}.md
    Then zero hits in any live or canonical file

  Scenario: Protocol + CLAUDE.md mention Initiative not Proposal
    When grep -nE "[Pp]roposal" .cleargate/knowledge/cleargate-protocol.md CLAUDE.md cleargate-planning/CLAUDE.md runs
    Then zero hits OUTSIDE §11.4 archive-immutability carve-out and §1 history-row tables (allowed: those preserve audit trail)

  Scenario: PROPOSAL-008 + PROPOSAL-009 archived
    When `ls .cleargate/delivery/archive/PROPOSAL-00{8,9}_*.md` runs
    Then both files are present
    And `ls .cleargate/delivery/pending-sync/PROPOSAL-00{8,9}_*.md` returns ENOENT
    And both archive copies have frontmatter `status: Archived` + `archived_at: <ISO>` + `archive_reason:` populated

  Scenario: Mirror parity holds
    When diff runs across all live↔canonical pairs touched by CR-025
    Then all diffs are empty (or scoped to pre-existing unrelated drift, documented in commit notes)
```

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — pending Gate 1 (push)**

Requirements to pass to Green:
- [x] Obsolete logic (Proposal artifact type, AI-authored Proposal mandate, `proposal_gate_waiver` field) explicitly declared.
- [x] New flow (Initiative outside-repo OR MCP pull → cached in pending-sync → triaged → archived with stamps) is concrete.
- [x] Three-story decomposition with file lists.
- [x] Verification protocol cites specific assertions + Gherkin coverage.
- [x] Backwards compat: archives preserve `proposal_gate_waiver`; only new templates drop it.
- [x] PROPOSAL-008 + PROPOSAL-009 fate decided (archive as-is).
