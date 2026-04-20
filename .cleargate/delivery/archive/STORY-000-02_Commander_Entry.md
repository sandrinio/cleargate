---
story_id: STORY-000-02
parent_epic_ref: EPIC-000
status: Completed
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-003_MCP_Adapter.md
sprint_id: SPRINT-03
shipped_commit: 43c50c3
completed_at: 2026-04-17T23:00:00Z
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:42:45.045Z
push_version: 3
---

# STORY-000-02: Commander Entry Point

**Complexity:** L1.

## 1. The Spec
Create `src/cli.ts` — the root Commander program that registers stub subcommands (`join`, `whoami`, `stamp`, `wiki`, `admin`) and global flags (`--profile`, `--mcp-url`, `--version`, `--help`).

### Out of Scope
Actual command implementations — placeholders print "not yet implemented".

## 2. Acceptance
```gherkin
Scenario: Help lists all subcommands
  When I run `cleargate --help`
  Then stdout lists join, whoami, stamp, wiki, admin

Scenario: Unknown subcommand errors cleanly
  When I run `cleargate nonsense`
  Then exit code is 1
  And stderr suggests `cleargate --help`
```

## 3. Implementation
- `cleargate-cli/src/cli.ts` — Commander program
- `cleargate-cli/src/commands/_stub.ts` — shared "not yet implemented" helper

## 4. Quality Gates
- Unit tests: parse known/unknown commands, flag precedence
- Lint passes on strict TS

## Ambiguity Gate
🟢 — straightforward.
