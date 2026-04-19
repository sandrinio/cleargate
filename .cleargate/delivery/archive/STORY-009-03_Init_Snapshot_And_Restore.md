---
story_id: "STORY-009-03"
parent_epic_ref: "EPIC-009"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md"
created_at: "2026-04-19T00:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
created_at_version: "post-SPRINT-04"
updated_at_version: "post-SPRINT-04"
---

# STORY-009-03: `cleargate init` Writes Install Snapshot + Restore-from-Marker

**Complexity:** L2 — extends existing `init` command; restore path adds a prompt flow.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder running `cleargate init`, I want the install to record what was installed and at what version so that drift detection and upgrade have a baseline; and if I previously uninstalled, I want to restore my preserved artifacts automatically.

### 1.2 Detailed Requirements

**Install snapshot:**
- As the FINAL step of `cleargate init` (after all scaffold files are written), copy the shipped `MANIFEST.json` verbatim to `.cleargate/.install-manifest.json`.
- Stamp `installed_at` with current UTC ISO-8601; preserve all other fields from the package manifest.
- Write atomically (write-temp-then-rename).
- Never hand-edit; the file is owned by `init` and `upgrade`.

**Restore-from-marker:**
- Before running install actions, check for `.cleargate/.uninstalled` marker.
- If present, print: `"Detected previous ClearGate install (uninstalled <uninstalled_at>, prior version <prior_version>). Restore preserved items? [Y/n]"`.
- On Y (default): for every path in `marker.preserved`, if the file still exists on disk (preserved as intended), leave it; if missing (e.g. user moved it), print a warning but don't fail.
- On N: log that preservation is being discarded; proceed with normal init (the preserved files remain on disk untouched unless they collide with scaffold paths — in which case treat as user-modified and enter drift-classification path).
- After a successful init, remove the `.uninstalled` marker regardless of Y/N choice (prevents repeated prompting).

**Blind copy, no schema migration** (PROP-006 Q6) — preserved files are user artifacts; v1 does NOT touch their frontmatter/content.

### 1.3 Out of Scope
Writing the marker itself (STORY-009-07 `uninstall`). Drift classification after restore (STORY-009-04 `doctor --check-scaffold`).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: init snapshot + restore

  Scenario: Fresh init writes snapshot
    Given an empty project directory with @cleargate/cli installed
    When cleargate init
    Then .cleargate/.install-manifest.json exists
    And cleargate_version matches the installed CLI version
    And installed_at is current UTC ISO-8601
    And files[] matches the shipped MANIFEST.json

  Scenario: Init detects .uninstalled and prompts
    Given .cleargate/.uninstalled exists with preserved: [".cleargate/FLASHCARD.md"]
    And .cleargate/FLASHCARD.md still exists on disk
    When cleargate init
    Then stdout prompts "Restore preserved items? [Y/n]"
    And on Y: FLASHCARD.md is untouched (preserved)
    And .uninstalled marker is removed after init completes

  Scenario: Init with N choice proceeds without restore
    Given .uninstalled marker exists
    When user answers N to the restore prompt
    Then init proceeds normally
    And preserved files on disk are NOT touched
    And the marker is removed

  Scenario: Atomic snapshot write
    Given an interrupted init
    Then .install-manifest.json either reflects the new install or does not exist — never half-written

  Scenario: Missing preserved file logged
    Given .uninstalled lists a preserved path that no longer exists on disk
    When restore runs
    Then a warning is printed naming the missing file
    And init does NOT fail
```

### 2.2 Verification Steps
- [ ] Manual: run init twice on the same dir — second run is idempotent.
- [ ] Manual: uninstall + init cycle preserves FLASHCARD.md content byte-for-byte.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/init.ts` (extend) |
| Related | `cleargate-cli/src/lib/manifest.ts` (STORY-009-01), `cleargate-cli/src/lib/prompts.ts` (existing — reuse Y/n prompt helper) |
| Deps | STORY-009-01, STORY-009-02 |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Init integration tests | 5 | 1 per Gherkin scenario |
| Atomicity test | 1 | Simulated crash; snapshot is never half-written |

## Ambiguity Gate
🟢.
