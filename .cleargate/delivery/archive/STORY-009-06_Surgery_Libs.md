---
story_id: STORY-009-06
parent_epic_ref: EPIC-009
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-006_Scaffold_Manifest_And_Uninstall.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:42:41.241Z
push_version: 3
---

# STORY-009-06: `claude-md-surgery.ts` + `settings-json-surgery.ts`

**Complexity:** L2 — shared surgery helpers; unit tests hammer the GREEDY-regex edge case from FLASHCARD 2026-04-19.

## 1. The Spec

### 1.1 User Story
As `cleargate init` and `cleargate uninstall`, I want shared libraries that surgically add/remove ClearGate content from `CLAUDE.md` and `.claude/settings.json` without clobbering unrelated user configuration.

### 1.2 Detailed Requirements

**`cleargate-cli/src/lib/claude-md-surgery.ts`:**
- Exports `readBlock(claudeMdContent: string): string | null` — returns the content between `<!-- CLEARGATE:START -->` and `<!-- CLEARGATE:END -->` markers, or null if either marker is missing.
- Exports `writeBlock(claudeMdContent: string, newBlock: string): string` — replaces the block content between markers (preserving markers themselves); if markers are missing, THROWS a clear error (`"CLAUDE.md is missing <!-- CLEARGATE:START --> marker"`).
- Exports `removeBlock(claudeMdContent: string): string` — removes both markers AND the content between; leaves surrounding content intact. Same throw-on-missing behavior.
- **Regex MUST be GREEDY** (`[\s\S]*` not `[\s\S]*?`) per FLASHCARD 2026-04-19 — the block body itself references both markers in prose (line 37 of current CLAUDE.md: "OUTSIDE this `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block").
- Idempotent: `writeBlock(writeBlock(x, v), v) === writeBlock(x, v)`.

**`cleargate-cli/src/lib/settings-json-surgery.ts`:**
- Exports `removeClearGateHooks(settings: ClaudeSettings): ClaudeSettings` — removes hook entries under `hooks.PostToolUse[]` / `hooks.SessionStart[]` / `hooks.SubagentStop[]` whose `command:` matches any of:
  - `.claude/hooks/token-ledger.sh`
  - `.claude/hooks/stamp-and-gate.sh`
  - `.claude/hooks/session-start.sh`
  - `.claude/hooks/wiki-ingest.sh` (legacy — if it still exists post-EPIC-008 merge)
  - Any path matching `.claude/hooks/cleargate-*.sh` (catch-all for future ClearGate-owned hooks).
- Preserves all other hook entries + all other top-level keys in settings.json.
- Exports `hasClearGateHooks(settings): boolean` — helper for conditional messaging.
- Uses a schema-driven JSON edit (not string regex) — parses settings.json, mutates the tree, re-serializes with 2-space indent preserving key order where possible.

### 1.3 Out of Scope
Actually calling these from init (STORY-009-03) or uninstall (STORY-009-07) — those stories wire them in.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Surgery libraries

  Scenario: readBlock extracts content between markers
    Given CLAUDE.md with "BEFORE\n<!-- CLEARGATE:START -->\nHELLO\n<!-- CLEARGATE:END -->\nAFTER"
    When readBlock is called
    Then result is "HELLO"

  Scenario: GREEDY regex handles body-mentions of markers
    Given CLAUDE.md where the block body itself contains "see the <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"
    When readBlock is called
    Then the FULL body (including the prose mentioning markers) is returned
    And no content is cut off at the inline prose reference

  Scenario: writeBlock replaces content, preserves surroundings
    Given CLAUDE.md with a current block
    When writeBlock(content, "NEW") is called
    Then surrounding content (BEFORE and AFTER) is unchanged
    And the block now contains "NEW"

  Scenario: Missing markers throws
    Given CLAUDE.md without markers
    When readBlock is called
    Then it returns null

    And when writeBlock is called
    Then it throws "CLAUDE.md is missing <!-- CLEARGATE:START --> marker"

  Scenario: removeBlock strips markers and content
    Given CLAUDE.md with a block
    When removeBlock is called
    Then both markers AND the content between them are gone
    And BEFORE/AFTER content is intact

  Scenario: writeBlock idempotent
    Given a CLAUDE.md with block content X
    When writeBlock is called twice with the same new content
    Then the result after the second call is byte-identical to the first

  Scenario: removeClearGateHooks strips only ClearGate hooks
    Given settings.json has one ClearGate PostToolUse hook AND one user-owned SubagentStop hook
    When removeClearGateHooks is called
    Then PostToolUse array is empty (or missing if that was the only entry)
    And SubagentStop hook remains intact
    And all other top-level keys are preserved

  Scenario: removeClearGateHooks is no-op on empty
    Given settings.json has no ClearGate hooks
    When removeClearGateHooks is called
    Then result is byte-equivalent to input (ignoring serialization whitespace)

  Scenario: hasClearGateHooks true/false
    Given settings.json has one ClearGate hook
    When hasClearGateHooks is called
    Then result is true
```

### 2.2 Verification Steps
- [ ] Run `readBlock` on the live repo's `CLAUDE.md` — result includes the full CLEARGATE:START/END content correctly despite the prose mention in line 37.

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | `cleargate-cli/src/lib/claude-md-surgery.ts`, `cleargate-cli/src/lib/settings-json-surgery.ts` |
| Related | `cleargate-cli/src/lib/json-format.ts` (if we extract stable-key-order serializer) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLAUDE.md unit tests | 7 | readBlock (happy, greedy-edge, missing-markers), writeBlock (happy, missing-throws, idempotent), removeBlock |
| settings surgery unit tests | 4 | strip-only-ours, preserve-user, no-op-on-empty, has-detector |
| Dogfood sanity | 1 | Call readBlock on live CLAUDE.md; result matches visual inspection |

## Ambiguity Gate
🟢.

## Notes

FLASHCARD 2026-04-19 `#init #inject-claude-md #regex` is the primary risk to mitigate. The greedy-vs-non-greedy edge case has already cost us once; the regex test MUST freeze a fixture that includes prose-mentions of both markers inside the block body.
