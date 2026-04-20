---
story_id: STORY-008-06
parent_epic_ref: EPIC-008
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:57.297Z
push_version: 3
---

# STORY-008-06: PostToolUse + SessionStart Hooks + `cleargate doctor`

**Complexity:** L2 — two bash hooks + one CLI command + settings.json registration (mirrored to cleargate-planning/).

## 1. The Spec

### 1.1 User Story
As an agent, I want every Write/Edit under `.cleargate/delivery/**` to auto-stamp tokens, auto-check gates, and auto-refresh the wiki page — and every session to boot with a blocked-items summary — so that readiness is always current and I know what's blocked without scanning anything.

### 1.2 Detailed Requirements

**`.claude/hooks/stamp-and-gate.sh` (PostToolUse):**
- Reads file path from stdin at `.tool_input.file_path` (FLASHCARD `#hooks #protocol` — NOT from env var).
- Chain (single process, ordered — stamp MUST precede gate):
  1. `cleargate stamp-tokens "$file"`
  2. `cleargate gate check "$file"` (preserve non-zero exit for enforcing types; swallow for advisory so the hook itself doesn't fail the agent turn)
  3. `cleargate wiki ingest "$file"` (existing command from SPRINT-04)
- Logs all stdout/stderr + exit code of each step to `.cleargate/hook-log/gate-check.log` with ISO-8601 timestamps.
- Exits 0 even on gate-check failure (severity enforcement happens at `wiki lint`, not at hook time).

**`.claude/hooks/session-start.sh` (SessionStart):**
- Runs `cleargate doctor --session-start`, pipes stdout into session context.
- Cap at 10 items; overflow → `"N items blocked — run \`cleargate doctor\` for full list"`.
- Capped output ≤ 100 LLM-tokens.

**`cleargate doctor`:**
- Base command (shared surface with EPIC-009 — see EPIC-008 §6 Q2).
- `--session-start` mode: scans `.cleargate/delivery/pending-sync/*.md`; emits one-line summary of items where `cached_gate_result.pass == false`.
- Default mode (no flag): reports hook health — last invocation times from `.cleargate/hook-log/`, failures in last 24h.
- `--pricing <file>` mode: reads a work item's `draft_tokens` + a pricing table and renders a USD estimate (PROP-005 §2.6). Pricing table lives in `cleargate-cli/src/lib/pricing.ts`.

**`.claude/settings.json` + `cleargate-planning/.claude/settings.json` (mirrored):**

```json
{
  "hooks": {
    "PostToolUse": [{
      "hooks": [{
        "type": "command",
        "if": "Edit(.cleargate/delivery/**)",
        "command": ".claude/hooks/stamp-and-gate.sh"
      }]
    }],
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/session-start.sh"
      }]
    }]
  }
}
```

Preserve any pre-existing hook entries (e.g., SPRINT-04's `cleargate-wiki-ingest` if still wired separately — merge rather than replace).

### 1.3 Out of Scope
`cleargate doctor --check-scaffold` (EPIC-009 STORY-009-04).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: stamp-and-gate hook + doctor

  Scenario: Hook stamps + gates + ingests on Write
    Given an agent writes .cleargate/delivery/pending-sync/STORY-Z.md
    When PostToolUse fires
    Then .cleargate/hook-log/gate-check.log shows stamp-tokens OK, gate check OK/WARN, wiki ingest OK
    And the file's frontmatter has draft_tokens + cached_gate_result populated

  Scenario: Hook exit 0 on gate fail (enforcing type)
    Given STORY-Z.md fails gate check (enforcing)
    When PostToolUse fires
    Then the hook exits 0
    And hook-log shows gate-check non-zero, but severity enforcement is deferred to wiki lint

  Scenario: SessionStart summary
    Given 3 pending-sync items have cached_gate_result.pass = false
    When session-start.sh runs
    Then stdout contains "3 items blocked:" + 3 item IDs
    And stdout is ≤ 100 LLM-tokens

  Scenario: SessionStart overflow
    Given 15 items are blocked
    When session-start.sh runs
    Then stdout shows 10 items + "5 more items blocked — run `cleargate doctor` for full list"

  Scenario: Doctor reports hook health
    Given hook-log has a failure in the last 24h
    When cleargate doctor
    Then stdout names the failing hook + ISO timestamp

  Scenario: Doctor pricing renders USD
    Given EPIC-008.md has draft_tokens populated
    When cleargate doctor --pricing EPIC-008.md
    Then stdout contains a USD estimate sourced from pricing.ts
```

### 2.2 Verification Steps
- [ ] `diff .claude/settings.json cleargate-planning/.claude/settings.json` returns empty (mirror discipline per FLASHCARD `#wiki #protocol #mirror`).
- [ ] Trigger the PostToolUse hook manually by writing a test file; hook-log entry appears.
- [ ] `cleargate doctor --help` lists all 3 modes.

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | `.claude/hooks/stamp-and-gate.sh`, `.claude/hooks/session-start.sh`, `cleargate-cli/src/commands/doctor.ts` |
| Mirrored Files | `cleargate-planning/.claude/hooks/stamp-and-gate.sh`, `cleargate-planning/.claude/hooks/session-start.sh` |
| Related | `.claude/settings.json`, `cleargate-planning/.claude/settings.json`, `cleargate-cli/src/lib/pricing.ts` (new) |
| Deps | STORY-008-03 (gate CLI), STORY-008-05 (stamp-tokens CLI) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| CLI integration tests | 4 | doctor modes × 3 + pricing fixture |
| Shell hook tests | 2 | stdin parsing, step ordering |
| Mirror-diff test | 1 | settings.json + hooks/ are identical between live and scaffold |

## Ambiguity Gate
🟢 — EPIC-008 §6 Q2 + Q4 resolved 2026-04-19: shared `doctor` surface (first-to-ship creates base), CLI-output unit tests only + manual DoD check for hook integration.
