---
story_id: STORY-009-07
parent_epic_ref: EPIC-009
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:18.300Z
push_version: 3
---

# STORY-009-07: `cleargate uninstall` — Preservation Flow + Safety Rails + `.uninstalled` Marker

**Complexity:** L3 — interactive uninstall with typed-confirmation ceremony; most-destructive command in the CLI.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder removing ClearGate from a project, I want `cleargate uninstall` to surgically remove framework files while preserving my accumulated FLASHCARD, archive, pending drafts, and sprint retrospectives — with clear previews and irreversible-action safeguards — so that I can try the framework without fear of data loss.

### 1.2 Detailed Requirements

**Invocation:**

```
cleargate uninstall [--dry-run] [--preserve <tier>,...] [--remove <tier>,...] [--yes] [--path <dir>]
```

**Flow** (interactive default) per PROP-006 §2.7:
1. Resolve target: CWD or `--path <dir>`. Require `.cleargate/.install-manifest.json` to exist (PROP-006 §6 Q6). If missing, print `"no ClearGate install detected at <path>"` and exit 0.
2. Load install manifest; compute file set.
3. Classify every path into one of the 8 preservation categories (PROP-006 §2.8).
4. Prompt per category (default shown in brackets) — unless `--preserve`/`--remove` CLI flags pre-specify.
5. Print summary: `"Will remove N files, keep M files, update CLAUDE.md to strip CLEARGATE block, remove @cleargate/cli from package.json."`
6. **Typed confirmation:** user types the project name (read from CWD `basename` or `package.json name`) before execution. `--yes` skips this but requires the flag to be explicit.
7. Execute removal:
   - Remove all files classified as `remove`.
   - ALWAYS removed (no prompt): ClearGate agent files (`.claude/agents/{architect,developer,qa,reporter,cleargate-wiki-*}.md`), ClearGate hooks (subset present per manifest), `.claude/skills/flashcard/`, ClearGate hook entries in `.claude/settings.json` (via STORY-009-06's settings surgery), CLAUDE.md CLEARGATE block (via STORY-009-06's claude-md surgery), `@cleargate/cli` from `package.json` dependencies + `package-lock.json` regenerate, `.cleargate/.install-manifest.json`, `.cleargate/.drift-state.json`.
   - Files classified as `keep`: untouched.
8. Write `.cleargate/.uninstalled` marker per PROP-006 §2.9 (uninstalled_at, prior_version, preserved[], removed[]).
9. If `.cleargate/` is empty after filtering, remove the directory. Otherwise leave remaining files in place.
10. Print one-line restore hint if any items were preserved: `"Preserved N items. Run cleargate init in this directory to restore."`

**Safety rails** (PROP-006 §2.10):
- **Single-target.** Does NOT recurse into nested `.cleargate/` instances. Operates on the resolved path only.
- **Typed confirmation.** Same ceremony as `rm -rf` safeguards.
- **`--dry-run`.** Prints every action without executing. Required for CI / scripted use.
- **`--yes`.** Skips typed confirmation; documented as dangerous.
- **Refuse on uncommitted changes.** If `git status --porcelain` shows uncommitted changes to any manifest-tracked file AND `--force` is not passed: refuse with a clear error (`"Uncommitted changes to tracked files. Commit, stash, or pass --force."`).
- **Idempotency.** Re-running uninstall after a successful uninstall prints `"already uninstalled"` and exits 0.

### 1.3 Out of Scope
Backup/restore beyond the `.uninstalled` marker (git is the backup story). Schema migration on restore (v1.1).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate uninstall

  Scenario: Dry-run shows preview without changes
    When cleargate uninstall --dry-run
    Then stdout lists all planned removals + preservations
    And no file on disk changes

  Scenario: Typed confirmation required
    When cleargate uninstall (interactive)
    And user types wrong project name
    Then stdout says "name mismatch — aborting"
    And no file on disk changes

  Scenario: Preserves user artifacts by default
    When cleargate uninstall --yes (non-interactive for test)
    Then .cleargate/FLASHCARD.md persists
    And .cleargate/delivery/archive/** persists
    And .cleargate/delivery/pending-sync/** persists
    And .cleargate/sprint-runs/*/REPORT.md persists

  Scenario: Removes framework files
    When cleargate uninstall --yes
    Then .cleargate/knowledge/ is removed
    And .cleargate/templates/ is removed
    And .cleargate/wiki/ is removed
    And .cleargate/hook-log/ is removed
    And .claude/agents/{architect,developer,qa,reporter}.md are removed
    And .claude/hooks/{token-ledger,stamp-and-gate,session-start}.sh are removed
    And .claude/skills/flashcard/ is removed

  Scenario: Surgery on CLAUDE.md + settings.json
    Given CLAUDE.md has CLEARGATE block AND settings.json has ClearGate hooks
    When cleargate uninstall --yes
    Then CLAUDE.md content between markers is removed (surroundings intact)
    And settings.json has NO ClearGate hook entries
    And settings.json retains any user-owned hooks

  Scenario: Writes .uninstalled marker
    When cleargate uninstall --yes
    Then .cleargate/.uninstalled exists
    And it has uninstalled_at, prior_version, preserved[], removed[]

  Scenario: Refuses on missing CLAUDE.md markers
    Given CLAUDE.md exists but has no CLEARGATE markers
    When cleargate uninstall --yes
    Then exits non-zero with error "CLAUDE.md is missing <!-- CLEARGATE:START --> marker"
    And NO files are removed

  Scenario: Refuses on uncommitted changes without --force
    Given git status shows uncommitted changes to cleargate-protocol.md
    When cleargate uninstall --yes
    Then exits non-zero with clear error
    And NO files are removed

  Scenario: Idempotent re-run
    Given a previous successful uninstall
    When cleargate uninstall
    Then stdout prints "already uninstalled"
    And exits 0

  Scenario: Single-target — does not recurse
    Given project has a nested cleargate-planning/.cleargate/
    When cleargate uninstall at project root
    Then only root .cleargate/ is affected
    And nested cleargate-planning/.cleargate/ is untouched

  Scenario: Empty .cleargate after preservation
    Given all preserved defaults are actively remove-d via --remove all
    When cleargate uninstall --yes --remove all
    Then .cleargate/ directory itself is removed

  Scenario: Missing .install-manifest.json
    Given target path has no .install-manifest.json
    When cleargate uninstall
    Then stdout: "no ClearGate install detected at <path>"
    And exits 0
```

### 2.2 Verification Steps
- [ ] Dry-run on a throwaway tmp-dir fixture matches expected preservation preview.
- [ ] Full uninstall in tmp-dir; re-install via `cleargate init` with restore prompt; FLASHCARD.md content byte-equivalent.
- [ ] `diff` CLAUDE.md before/after uninstall — only the CLEARGATE block is gone.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/uninstall.ts` |
| Related | `cleargate-cli/src/lib/manifest.ts` (STORY-009-01), `claude-md-surgery.ts` + `settings-json-surgery.ts` (STORY-009-06) |
| Deps | STORY-009-01, STORY-009-03, STORY-009-06 |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLI integration tests | 12 | 1 per Gherkin scenario |
| Unit tests | 3 | Category classifier, marker-writer, preservation-flag-parser |
| Fixture-based integration | 2 | Full uninstall + restore cycle on tmp-dir; refuse-on-uncommitted |

## Ambiguity Gate
🟢.

## Notes

This is the most-destructive command in the CLI. QA gate must include a manual end-to-end walkthrough on a scratch project before merge.
