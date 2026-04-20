---
story_id: STORY-009-04
parent_epic_ref: EPIC-009
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:24.830Z
push_version: 3
---

# STORY-009-04: `cleargate doctor --check-scaffold` + Drift Cache

**Complexity:** L2 — extends EPIC-008's `doctor.ts` with a scaffold mode; daily-throttled refresh logic.

## 1. The Spec

### 1.1 User Story
As an agent at session-start (or a Vibe Coder on demand), I want a fast summary of which scaffold files are user-modified, upstream-changed, or both-changed so that I know what to review before running `upgrade`.

### 1.2 Detailed Requirements

**`cleargate doctor --check-scaffold`:**
- Loads package manifest + install snapshot (STORY-009-01 libs).
- Computes current SHA for every tracked file.
- Classifies each entry per PROP-006 §2.4.
- Writes `.cleargate/.drift-state.json` atomically (PROP-006 Q1 — raw file is internal; CLI renders the view).
- Prints a summary to stdout:
  - `"Scaffold drift: 2 user-modified, 1 upstream-changed, 0 both-changed, 37 clean"`.
  - If anything upstream-changed or both-changed: add a one-liner pointer `"Run cleargate upgrade to review."`.
  - `user-artifact` tier skipped silently (PROP-006 Q8).
- `--verbose` / `-v` flag: list each non-clean file with its state and short-hash pair `(installed → current vs. package)`.

**Daily-throttled refresh:**
- `.drift-state.json` carries `last_refreshed: <ISO-8601>`.
- If last_refreshed < now - 24h, recompute; otherwise reuse cached state (when invoked via SessionStart hook with `--session-start-mode`).
- Explicit `cleargate doctor --check-scaffold` (interactive) always recomputes (bypasses throttle).

**Agent-facing drift signal** (for consumption by the agent at triage):
- Agents read `.drift-state.json` directly (no subcommand invocation — pure FS read).
- If the cache has any `upstream-changed` or `both-changed` entry: emit a one-line advisory at triage.
- **Never auto-overwrite.**

**`cleargate doctor` base command coordination** (cross-Epic with EPIC-008):
- If EPIC-008 ships first: this story ONLY adds `--check-scaffold` mode to the existing `doctor.ts`.
- If EPIC-009 ships first: this story creates the base `doctor.ts` command with the subcommand dispatcher + `--check-scaffold` only. EPIC-008 STORY-008-06 later extends with `--session-start` / `--pricing`.
- Modes are mutually exclusive — cannot combine flags.

### 1.3 Out of Scope
The upgrade merge flow (STORY-009-05). Daily-throttle integration with the SessionStart hook itself (that hook lives in EPIC-008 STORY-008-06; this story provides the CLI surface it calls).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: doctor --check-scaffold

  Scenario: Clean repo reports clean
    Given all manifest files match package SHAs
    When cleargate doctor --check-scaffold
    Then stdout: "Scaffold drift: 0 user-modified, 0 upstream-changed, 0 both-changed, N clean"
    And .drift-state.json is written

  Scenario: User-modified file detected
    Given user edited .cleargate/knowledge/cleargate-protocol.md after install
    When cleargate doctor --check-scaffold
    Then .drift-state.json lists cleargate-protocol.md as "user-modified"
    And stdout summary reports "1 user-modified"

  Scenario: Upstream-changed surfaces pointer
    Given package manifest has a newer SHA than install snapshot for cleargate-protocol.md
    And user has not modified the file
    When cleargate doctor --check-scaffold
    Then stdout includes "Run cleargate upgrade to review."

  Scenario: user-artifact skipped silently
    Given FLASHCARD.md differs from install-snapshot (sha was null)
    When cleargate doctor --check-scaffold
    Then FLASHCARD.md does NOT appear in drift output

  Scenario: Daily throttle
    Given .drift-state.json has last_refreshed = 10 minutes ago
    When cleargate doctor --check-scaffold --session-start-mode
    Then cache is reused (no SHA re-compute)

  Scenario: Interactive mode bypasses throttle
    Given .drift-state.json was refreshed 10 minutes ago
    When cleargate doctor --check-scaffold (no --session-start-mode)
    Then SHAs are recomputed and last_refreshed is updated

  Scenario: Verbose listing
    When cleargate doctor --check-scaffold -v
    Then stdout shows one line per non-clean file with state + short-hash triple
```

### 2.2 Verification Steps
- [ ] `cleargate doctor --check-scaffold --help` describes modes.
- [ ] Run on this repo: output lists the expected drift (dogfood sanity).

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/doctor.ts` (extend OR create, depending on EPIC-008 ordering) |
| Deps | STORY-009-01 (manifest lib) |
| Cross-Epic | EPIC-008 STORY-008-06 (doctor base command) — see coordination note |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLI tests | 6 | 1 per Gherkin scenario except throttle which is 2 |
| Unit tests | 2 | Verbose formatter, throttle decision |

## Ambiguity Gate
🟢 — EPIC-009 §6 Q2 resolved 2026-04-19: shared `doctor` surface (first-to-ship creates base, second extends).
