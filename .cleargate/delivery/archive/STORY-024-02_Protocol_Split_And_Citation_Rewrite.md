---
story_id: STORY-024-02-Protocol_Split_And_Citation_Rewrite
parent_epic_ref: EPIC-024
parent_cleargate_id: EPIC-024
sprint_cleargate_id: null
carry_over: false
status: Done
approved: true
approved_at: 2026-05-01T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-024_AI_Orientation_Surface_Slim.md (Workstream B — §0 XML target_files for cleargate-protocol.md slim + cleargate-enforcement.md create + ~92-citation rewrite, §2 IN-SCOPE Workstream B, §3 Reality Check '§11.4 archive-immutability carve-out' + 'Citation completeness' rows, §5 Acceptance scenarios 'Protocol split — full rewrite, no stub redirects' / 'Citation rewrite is complete' / 'Citation rewrite preserves archive audit trail'). Parent epic Gate 1 waived per its proposal_gate_waiver frontmatter; this story inherits the waiver.
actor: Every AI agent that reads cleargate-protocol.md or follows a §-citation in a story or agent file
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
created_at: 2026-04-30T18:30:00Z
updated_at: 2026-04-30T18:30:00Z
created_at_version: cleargate@0.9.0
updated_at_version: cleargate@0.9.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T08:08:45Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-024-02-Protocol_Split_And_Citation_Rewrite
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T08:08:45Z
  sessions: []
---

# STORY-024-02: Protocol Split + Full Citation Rewrite
**Complexity:** L3 — multi-file split + scripted ~92-citation rewrite across live + archived surfaces, with a one-time §11.4 archive-immutability carve-out.

**Wave dependency:** Wave 2 — must follow STORY-024-01 merge. Both stories edit `architect.md`; sequential merge prevents shared-surface conflict on Workflow step 4.

## 1. The Spec (The Contract)

### 1.1 User Story

As an **AI agent operating in this repo**, I want enforcement-only rules (worktree mechanics, file-surface diff, lifecycle reconciler, lane rubric, doctor exit codes, etc.) moved out of `cleargate-protocol.md` into a separate `cleargate-enforcement.md` file that I read only when a CLI hook surfaces an error, so that the always-read protocol file shrinks from 1088 lines to ~400 lines and orientation cost drops materially without any rule semantic change.

### 1.2 Detailed Requirements

**Phase 1 — Create `cleargate-enforcement.md`:**

- Create new file at `.cleargate/knowledge/cleargate-enforcement.md`.
- Receive the body of `cleargate-enforcement.md` §§1, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27 in source order. Renumber as §§1..12 in the new file.
- Each section heading carries a `(source: protocol §<old>)` annotation, e.g. `## 1. Worktree Lifecycle (source: protocol §1)`.
- Top-of-file index table maps every new §N → source §<old> → title, in order.
- Section bodies are byte-identical to the original modulo internal cross-reference updates (e.g. a sentence in old §2 that says "see §4.2" must become "see §4.2" in the new numbering).
- Mirror to `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md`. Post-create `diff` between live and canonical returns empty.

**Phase 2 — Slim `cleargate-protocol.md`:**

- In `.cleargate/knowledge/cleargate-enforcement.md`, **remove** §§1-20 + §§7-27 entirely. **No stub redirects** (per EPIC-024 §6 Q3: full rewrite, not hybrid).
- The slim file retains §§1-14 + §21 only.
- Total line count drops from 1088 to ≤500 lines (target ~400).
- Mirror to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`. Post-slim `diff` empty.

**Phase 3 — Full citation rewrite across all surfaces:**

- Build the §-mapping table (Phase 1 output): `{15→1, 16→2, 17→3, 18→4, 19→5, 20→6, 22→7, 23→8, 24→9, 25→10, 26→11, 27→12}`.
- Grep `§(15|16|17|18|19|20|22|23|24|25|26|27)\b` across all citation surfaces (see §3.1).
- Pre-merge baseline as of 2026-04-30: ~92 occurrences (verified via `grep -rE '§(15|16|17|18|19|20|22|23|24|25|26|27)\b' ...`).
- For each match where the citation refers to `cleargate-protocol.md` (by name OR by implication via context), substitute:
  - The §-number per the mapping table.
  - The filename `cleargate-protocol.md` → `cleargate-enforcement.md` if the file is named adjacent to the citation.
- Post-rewrite verification: `grep -rE '§(15|16|17|18|19|20|22|23|24|25|26|27)\b.*cleargate-protocol' <surfaces>` returns zero matches.

**§11.4 archive-immutability carve-out (one-time, scoped to this story):**

- Archived files (`.cleargate/delivery/archive/**`) take ONLY citation §-substitution edits.
- **Forbidden** in archive paths: any frontmatter field change (no `updated_at`, no `last_stamp`, no `last_synced_body_sha`, no `cleargate stamp` invocation), any non-citation body change.
- **Allowed**: `§<old>` → `§<new>` token substitution, `cleargate-protocol.md` → `cleargate-enforcement.md` filename swap immediately adjacent to a citation.
- Verified by acceptance scenario "Citation rewrite preserves archive audit trail": `git diff <pre> HEAD -- <archive-file>` shows only those substitution lines, zero frontmatter diff hunks.

**§3.1 self-amendment under file-surface gate (protocol §20.1, option 2):**

- The citation-rewrite scope spans dozens of files that cannot all be enumerated in §3.1 ahead of execution. Per protocol §20.1, this story's commit is a **self-amending §3.1 surface** — the Developer agent runs the citation grep, captures the concrete file list, appends it to §3.1 in the same commit as the rewrite itself, and includes the explicit self-amend justification in the commit message: `STORY-024-02: §3.1 self-amended with citation-rewrite file list per protocol §20.1 option 2 — scope is grep-derived, not pre-enumerable`.

### 1.3 Out of Scope

- Renumbering §§1-14 + §21 in the slim protocol — they keep their existing numbers.
- Renumbering inside `cleargate-enforcement.md` after first creation — once a §N is assigned in Phase 1, it's stable.
- Adding any new content to the moved sections. Body is byte-identical to original modulo internal cross-reference updates.
- Modifying CLI / hook behavior. Hooks may reference `cleargate-enforcement.md` in new error messages but the underlying gate logic is unchanged.
- Touching `.cleargate/sprint-runs/**` — those are runtime artifacts, not citation surfaces.
- Updating `.cleargate/wiki/**` synthesis pages by hand — the wiki rebuild hook regenerates them after the citation-source files merge.
- Promoting the orientation token budget to a `cleargate doctor` failing check (deferred per EPIC-024 §6 Q5; separate CR).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Protocol split + full citation rewrite

  Scenario: cleargate-enforcement.md created with annotations
    Given STORY-024-02 has merged
    When `.cleargate/knowledge/cleargate-enforcement.md` is read
    Then a top-of-file index table exists mapping new §1..§12 → source §1..§12 → title
    And every section heading carries a "(source: protocol §<old>)" annotation
    And section bodies are byte-identical to the original cleargate-protocol.md content modulo internal cross-reference updates

  Scenario: cleargate-protocol.md slimmed, no stub redirects
    Given STORY-024-02 has merged
    When `grep -E '^## (15|16|17|18|19|20|22|23|24|25|26|27)\b' .cleargate/knowledge/cleargate-protocol.md` runs
    Then it returns zero matches
    And `wc -l .cleargate/knowledge/cleargate-protocol.md` reports ≤500 lines (was 1088)

  Scenario: Citation rewrite is complete across all surfaces
    Given STORY-024-02 has merged
    When `grep -rE '§(15|16|17|18|19|20|22|23|24|25|26|27)\b' .cleargate/delivery/ .claude/agents/ cleargate-planning/ CLAUDE.md .cleargate/wiki/ | grep -i 'cleargate-protocol'` runs
    Then it returns zero matches
    And every prior occurrence of those §-numbers that referenced cleargate-protocol.md now references cleargate-enforcement.md with the new § per the mapping table

  Scenario: Citation rewrite preserves archive audit trail
    Given a file F in .cleargate/delivery/archive/ contained citations to moved §§ before STORY-024-02
    When `git diff <pre-merge-sha> HEAD -- F` is examined
    Then every changed line is either a §<old>→§<new> substitution OR a cleargate-protocol.md→cleargate-enforcement.md filename swap
    And no YAML frontmatter field of F changed
    And no other body content of F changed

  Scenario: Mirror parity preserved
    Given STORY-024-02 has merged
    When `diff .cleargate/knowledge/cleargate-protocol.md cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` runs
    Then the diff is empty
    And `diff .cleargate/knowledge/cleargate-enforcement.md cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` is empty

  Scenario: §3.1 self-amendment justified in commit message
    Given STORY-024-02 has merged
    When the commit message is examined
    Then it contains "§3.1 self-amended" and references "protocol §20.1 option 2"
    And the §3.1 table in the committed STORY-024-02_*.md file lists the concrete citation-rewrite file paths

  Scenario: No regression on existing tests
    Given STORY-024-02 has merged
    When `cleargate doctor`, `cleargate wiki lint`, `node .cleargate/scripts/state-scripts.test.mjs`, and `node .cleargate/scripts/test_ratchet.mjs` run
    Then all four exit 0
```

### 2.2 Verification Steps (Manual)

- [ ] Read `.cleargate/knowledge/cleargate-enforcement.md` top-of-file index — verify §1..12 → source §1..27 mapping is complete and ordered.
- [ ] Confirm slim `cleargate-protocol.md` ≤500 lines and contains §§1-14 + §21 only.
- [ ] Run citation grep with `cleargate-protocol` filter — zero matches.
- [ ] Spot-check 3 archived story files chosen at random: confirm only §-substitution + filename-swap diff lines, zero frontmatter mutation.
- [ ] Mirror diff: both knowledge files diverge by zero bytes from canonical.
- [ ] Run `cleargate doctor`, `cleargate wiki lint`, `node .cleargate/scripts/state-scripts.test.mjs`, `node .cleargate/scripts/test_ratchet.mjs` — all exit 0.
- [ ] Verify the commit message contains the §3.1 self-amend justification per protocol §20.1.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** every file staged in this story's commit must appear below. **This table is self-amending per protocol §20.1 option 2** — Developer agent enumerates the concrete citation-rewrite file list at execution time and appends it to this table in the same commit. Justification (grep-derived scope, not pre-enumerable at draft time) is recorded in the commit message.

| Item | Value |
|---|---|
| Primary File (NEW) | `.cleargate/knowledge/cleargate-enforcement.md` |
| Primary File (modify) | `.cleargate/knowledge/cleargate-protocol.md` |
| Mirror Files | `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`, `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` |
| New Files Needed | Yes — `cleargate-enforcement.md` at both live + canonical paths |
| Mirrors | Yes — knowledge files mirrored to `cleargate-planning/` with empty diff |
| Citation rewrite scope (root prefixes — concrete file list self-amended at execution time) | `.cleargate/delivery/archive/`, `.cleargate/delivery/pending-sync/`, `.claude/agents/`, `cleargate-planning/.claude/agents/`, `CLAUDE.md`, `cleargate-planning/CLAUDE.md`, `.cleargate/wiki/` |

### 3.2 Technical Logic

**Phase 1 — Build cleargate-enforcement.md:**

1. Open `.cleargate/knowledge/cleargate-enforcement.md`. Identify the byte ranges for §§1, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27 by matching `^## N\.` heading boundaries.
2. Extract those ranges in source order. The expected new-§ assignment is:

   | New § | Source § | Title (current) |
   |---|---|---|
   | §1 | §1 | Worktree Lifecycle (v2) |
   | §2 | §2 | User Walkthrough on Sprint Branch (v2) |
   | §3 | §3 | Mid-Sprint Change Request Triage (v2) |
   | §4 | §4 | Immediate Flashcard Gate (v2) |
   | §5 | §5 | Execution Mode Routing (v2) |
   | §6 | §6 | File-Surface Contract (v2) |
   | §7 | §7 | Advisory Readiness Gates on Push (v2) — CR-010 |
   | §8 | §8 | Doctor Exit-Code Semantics |
   | §9 | §9 | Lane Routing |
   | §10 | §10 | Lifecycle Reconciliation (CR-017) |
   | §11 | §11 | Decomposition Gate (CR-017) |
   | §12 | §12 | Gate 3.5 — Sprint Close Acknowledgement (CR-019) |

3. For each section, replace its heading `## <old-N>. <title>` with `## <new-N>. <title> (source: protocol §<old-N>)`.
4. Internal cross-reference updates **inside the moved sections**: any reference to another moved § must be renumbered. Examples: §2 referencing "§4 Immediate Flashcard Gate" becomes "§4 Immediate Flashcard Gate"; §4 referencing "§4.2" becomes "§4.2"; §10 cross-referencing "§11" becomes "§11". References to non-moved §§ (e.g. "§4 Phase Gates", "§11.4") stay numerically unchanged but the surrounding prose may need a "in `cleargate-enforcement.md`" qualifier for clarity.
5. Prepend a top-of-file index:

   ```markdown
   # ClearGate Enforcement

   Hook-enforced rules surfaced by CLI errors. AI agents read this file when a hook trips, not at session start. Source split from `cleargate-protocol.md` per EPIC-024 (2026-04-30).

   ## Index

   | New § | Source § | Title |
   |---|---|---|
   | §1 | protocol §1 | Worktree Lifecycle (v2) |
   ... (etc, full 12-row table)
   ```

6. Save as `.cleargate/knowledge/cleargate-enforcement.md`. Mirror to `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` (`cp` is fine — both files are byte-identical).

**Phase 2 — Slim cleargate-protocol.md:**

1. From `.cleargate/knowledge/cleargate-enforcement.md`, **remove** the byte ranges for §§1-20 + §§7-27. No stub anchors. The horizontal-rule separators (`---`) flanking removed sections also drop.
2. Verify §§1-14 + §21 remain. Verify the protocol's "## N." heading sequence is now `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 21` (gap from 14 → 21 is intentional and accepted; no renumber).
3. Verify `wc -l` reports ≤500 lines.
4. Mirror to `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`.

**Phase 3 — Citation rewrite:**

1. Author a Node script `cleargate-cli/scripts/migrate-024-citations.mjs` (or invoke ad-hoc; not committed as a permanent CLI surface):
   - Reads the §-mapping table.
   - Globs all citation surfaces (see §3.1).
   - For each file, scans for `§(15|16|17|18|19|20|22|23|24|25|26|27)\b`.
   - For each match, determines whether the citation refers to `cleargate-protocol.md` (default assumption — but skip matches inside `cleargate-enforcement.md` itself, those are the new § numbers, and skip matches that explicitly cite a different file).
   - Substitutes `§<old>` → `§<new>` and replaces the filename `cleargate-protocol.md` → `cleargate-enforcement.md` in the same line if present.
   - Logs every substitution with file + line + before/after.
   - **For paths under `.cleargate/delivery/archive/`**: applies citation-only edits; refuses to touch any line that begins with `^[a-z_]+:` (frontmatter field detection) and refuses to invoke any stamp/timestamp side-effect.
2. Run the script. Capture the substitution log.
3. Append the concrete file list (deduped, sorted) to STORY-024-02's §3.1 table in the same commit. Justification in commit message: `STORY-024-02: §3.1 self-amended with citation-rewrite file list per protocol §20.1 option 2 — scope is grep-derived, not pre-enumerable`.
4. Run the verification grep: `grep -rE '§(15|16|17|18|19|20|22|23|24|25|26|27)\b' .cleargate/delivery/ .claude/agents/ cleargate-planning/ CLAUDE.md .cleargate/wiki/ | grep -i 'cleargate-protocol'` returns zero matches.
5. Run `cleargate doctor`, `cleargate wiki lint`, `node .cleargate/scripts/state-scripts.test.mjs`, `node .cleargate/scripts/test_ratchet.mjs` — all exit 0.

**Single commit.** Phases 1, 2, 3 land in one atomic commit. The repo MUST NOT contain a state where the protocol is slim but citations still point at moved §§ in `cleargate-protocol.md`.

### 3.3 API Contract

N/A — pure documentation refactor. No CLI / MCP / DB / hook surface change.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Citation completeness greps | 2 | (a) zero `^## (15-20\|22-27)\b` headings in slim cleargate-protocol.md; (b) zero `§(moved)\b.*cleargate-protocol` matches across surfaces |
| Mirror diff | 2 | protocol + enforcement files, both empty diff vs. canonical |
| Archive audit-trail spot-check | 3 | Three archived files chosen at random — `git diff` shows only substitution lines, zero frontmatter changes |
| Commit-message §3.1 self-amend justification | 1 | Commit message contains the literal phrase "§3.1 self-amended" + "protocol §20.1" |
| Existing test pass | 4 | `cleargate doctor`, `cleargate wiki lint`, `state-scripts.test.mjs`, `test_ratchet.mjs` all exit 0 |

### 4.2 Definition of Done (The Gate)

- [ ] Phase 1 complete: `cleargate-enforcement.md` exists at live + canonical with index + annotated headings.
- [ ] Phase 2 complete: `cleargate-protocol.md` ≤500 lines at live + canonical, no stub redirects.
- [ ] Phase 3 complete: zero residual `cleargate-protocol`-flavored citations to moved §§ across all surfaces.
- [ ] All §2.1 Gherkin scenarios pass.
- [ ] §3.1 self-amended in the same commit; commit message carries the protocol §20.1 justification.
- [ ] No regression: `cleargate doctor`, `cleargate wiki lint`, `state-scripts.test.mjs`, `test_ratchet.mjs` all exit 0.
- [ ] Archive immutability carve-out honored: zero frontmatter changes in any `.cleargate/delivery/archive/` file's diff.
- [ ] Commit message: `feat(EPIC-024): STORY-024-02 Protocol split + full citation rewrite`.
- [ ] Architect (gate review) approves.

### 3.1 Concrete Citation-Rewrite File List (self-amended per protocol §20.1 option 2)

Files staged in this commit (grep-derived, deduped, sorted):

| File | Role |
|---|---|
| `.claude/agents/architect.md` | citation-rewrite surface (Phase 3 + Phase 4) |
| `.claude/agents/developer.md` | citation-rewrite surface |
| `.claude/agents/qa.md` | citation-rewrite surface |
| `.claude/agents/reporter.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/CR-014_Sprint_Init_Gate_Multi_Type_Decomposition_Check.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/CR-017_Lifecycle_Status_Reconciliation_At_Sprint_Boundaries.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/EPIC-014_Execution_V2_Polish.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/PROPOSAL-013_Cleargate_MCP_Native_Source_Of_Truth.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/SPRINT-10_Execution_V2_Polish.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/SPRINT-14_Process_v2.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/SPRINT-15_Process_v3.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-013-05_Orchestrator_Interrupt_Handling.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-013-06_Immediate_Flashcard_Gate.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-013-08_Execution_Mode_Flag.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-014-01_Doctor_Exit_Code_Semantics.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-014-01_File_Surface_Diff_Gate.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-014-03_Flashcard_Gate_Enforcement.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-014-09_Architect_Numbering_And_Split_Signal.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-015-05_Hierarchy_Frontmatter_Keys.md` | citation-rewrite surface |
| `.cleargate/delivery/archive/STORY-022-01_Architect_Lane_Classification_And_Protocol_Section_14.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/CR-019_Sprint_Close_Requires_Explicit_Human_Ack.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/CR-021_Prepare_Close_Observe_Phase_Mechanics.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/EPIC-023_MCP_Native_Source_Of_Truth.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/EPIC-024_AI_Orientation_Surface_Slim.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/SPRINT-17_Plan_Phase_Delivery.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/STORY-016-02_Doctor_Session_Start_Notifier.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/STORY-016-03_Changelog_Backfill_And_Tarball.md` | citation-rewrite surface |
| `.cleargate/delivery/pending-sync/STORY-024-02_Protocol_Split_And_Citation_Rewrite.md` | self-amend |
| `.cleargate/knowledge/cleargate-enforcement.md` | Phase 1 new file |
| `.cleargate/knowledge/cleargate-protocol.md` | Phase 2 slim |
| `.cleargate/wiki/stories/STORY-022-01.md` | citation-rewrite surface |
| `cleargate-planning/.claude/agents/architect.md` | citation-rewrite surface (Phase 3 + Phase 4) |
| `cleargate-planning/.claude/agents/developer.md` | citation-rewrite surface |
| `cleargate-planning/.claude/agents/qa.md` | citation-rewrite surface |
| `cleargate-planning/.claude/agents/reporter.md` | citation-rewrite surface |
| `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` | Phase 1 mirror |
| `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` | Phase 2 mirror |
| `cleargate-planning/.cleargate/scripts/test/test_flashcard_gate.sh` | citation-rewrite surface |
| `cleargate-planning/.cleargate/templates/Sprint Plan Template.md` | citation-rewrite surface |
| `cleargate-planning/.cleargate/templates/sprint_report.md` | citation-rewrite surface |
| `cleargate-planning/.cleargate/templates/story.md` | citation-rewrite surface |
| `cleargate-planning/MANIFEST.json` | MANIFEST update (new entry + sha256 refresh) |

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths (live + canonical knowledge/ paths exist; citation surfaces verified by `grep -rE '§(15-20|22-27)\b' ...` returning ~92 matches across the listed root prefixes as of 2026-04-30).
- [x] No "TBDs" exist anywhere in the specification or technical logic.
