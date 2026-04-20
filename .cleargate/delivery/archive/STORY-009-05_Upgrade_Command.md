---
story_id: STORY-009-05
parent_epic_ref: EPIC-009
status: Draft
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:07.189Z
push_version: 3
---

# STORY-009-05: `cleargate upgrade` — Three-Way Merge Driver

**Complexity:** L3 — interactive merge UX; incremental per-file execution; snapshot updates after each successful file.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder running `cleargate upgrade`, I want ClearGate to walk each tracked file, offer a three-way merge on `prompt-on-drift` files, and update my install snapshot as files are resolved, so that I can adopt upstream changes without losing my local customizations.

### 1.2 Detailed Requirements

**Flow per PROP-006 §2.6:**
1. Load package manifest + install snapshot; compute current SHAs.
2. For each tracked file, classify via STORY-009-01's `manifest.classify()`.
3. Group action by `overwrite_policy`:
   - `always` → overwrite silently.
   - `never` → skip silently.
   - `prompt-on-drift` → interactive prompt (see below).
4. After each successful file: update `.install-manifest.json` to reflect its new on-disk SHA.
5. After all files: refresh `.drift-state.json`.

**Three-way merge prompt** (PROP-006 Q3 — inline patch-style + three choices):
- Print the file path + drift state.
- Print an inline unified-diff-style patch (ours vs. theirs) using a small diff lib (`diff` npm or hand-rolled using `diff` module).
- Prompt: `[k]eep mine / [t]ake theirs / [e]dit in $EDITOR`.
- On `k`: skip; current file unchanged; snapshot updated to record `current_sha` as the installed_sha.
- On `t`: overwrite file with package content; snapshot updated to `package_sha`.
- On `e`: write a conflict-marker file with `<<<<<<< ours` / `=======` / `>>>>>>> theirs` blocks; open `$EDITOR`; after the editor exits, verify markers are resolved; snapshot updated to the post-edit SHA.

**Incremental execution** (PROP-006 Q9):
- Each file is handled independently. If file 2's merge fails (e.g., editor crashed, markers unresolved), files 1's changes stick and file 3 is still offered.
- `.install-manifest.json` updated atomically after each file — so `upgrade` is resumable (re-run picks up where it left off).

**Flags:**
- `--dry-run`: print the plan only (which files would be `always` / `never` / `prompt-on-drift`) without any disk changes.
- `--yes`: auto-accept "take theirs" on all `prompt-on-drift` files (non-interactive; dangerous — documented).
- `--only <tier>`: restrict to a specific tier (e.g., `--only protocol` to just review protocol drift).

### 1.3 Out of Scope
External merge tools (kdiff3 / vimdiff) — deferred to v1.1 per PROP-006 Q3. Transactional (all-or-nothing) semantics — explicitly incremental per PROP-006 Q9.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate upgrade

  Scenario: Dry-run prints plan without changes
    Given 3 files drifted
    When cleargate upgrade --dry-run
    Then stdout lists 3 proposed actions
    And no file on disk changes
    And .install-manifest.json is unchanged

  Scenario: Keep-mine on prompt-on-drift
    Given cleargate-protocol.md is user-modified
    When upgrade prompts and user chooses k
    Then file is unchanged
    And snapshot's installed_sha for that file = current_sha (records "I chose mine")

  Scenario: Take-theirs on prompt-on-drift
    Given cleargate-protocol.md is upstream-changed
    When upgrade prompts and user chooses t
    Then file is overwritten with package content
    And snapshot's installed_sha = package_sha

  Scenario: Edit-in-editor with conflict markers
    Given file is both-changed
    When user chooses e
    Then a conflict-markered file is written
    And $EDITOR opens
    And after editor exit: markers are verified absent
    And snapshot reflects the post-edit SHA

  Scenario: Edit-in-editor with unresolved markers fails gracefully
    Given user exits editor with markers still present
    Then upgrade prints an error naming the file
    And leaves the file in its post-edit state (conflict markers visible for the user to resolve manually)
    And does NOT update the snapshot for that file

  Scenario: Incremental survival
    Given 3 prompt-on-drift files
    When file 2 fails during merge
    Then file 1's change persists on disk
    And snapshot reflects file 1
    And file 3 is still offered

  Scenario: Always-policy silent overwrite
    Given a `tier: derived` file with overwrite_policy: always
    When upgrade runs
    Then the file is overwritten silently (no prompt)

  Scenario: Never-policy silent skip
    Given a `tier: user-artifact` file with overwrite_policy: never
    When upgrade runs
    Then the file is untouched (no prompt)

  Scenario: --yes auto-takes-theirs
    When cleargate upgrade --yes
    Then every prompt-on-drift file is overwritten with package content
    And stdout logs the aggregate action
```

### 2.2 Verification Steps
- [ ] Dogfood run on this repo with `--dry-run` — plan matches what we'd expect given current drift.
- [ ] Simulated editor crash during merge — resumability verified by re-running `upgrade`.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/upgrade.ts` |
| Related | `cleargate-cli/src/lib/merge-ui.ts` (new — diff rendering + prompt), `cleargate-cli/src/lib/editor.ts` (new — spawn $EDITOR safely) |
| Deps | STORY-009-01 (manifest lib), STORY-009-02 (package manifest ships with build) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLI integration tests | 9 | 1 per Gherkin scenario |
| Unit tests | 4 | Diff renderer, marker verifier, snapshot-update atomicity, tier-filter (--only) |

## Ambiguity Gate
🟢.
