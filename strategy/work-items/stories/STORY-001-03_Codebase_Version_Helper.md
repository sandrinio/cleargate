---
story_id: "STORY-001-03"
parent_epic_ref: "EPIC-001"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-001_Document_Metadata.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-001-03: `codebase-version.ts` Helper

**Complexity:** L2.

## 1. The Spec
Utility that returns a version string using (in order): git short SHA (with `-dirty` if working tree has uncommitted changes), `package.json` version, or `"unknown"` with a warning.

### Detailed Requirements
- `git rev-parse --short HEAD` → SHA
- `git status --porcelain` → non-empty → append `-dirty`
- Fallback: read nearest `package.json` walking up
- Pure function; caller handles IO

## 2. Acceptance
```gherkin
Scenario: Clean git
  Given a clean git worktree at commit a3f2e91
  When getCodebaseVersion() runs
  Then returns "a3f2e91"

Scenario: Dirty git
  Given uncommitted changes exist
  When getCodebaseVersion() runs
  Then returns "a3f2e91-dirty"

Scenario: No git, package.json present
  Given no .git but package.json v1.4.2 in cwd
  Then returns "1.4.2"

Scenario: Neither
  Then returns "unknown" and a warning is emitted
```

## 3. Implementation
- `cleargate-cli/src/utils/codebase-version.ts`

## 4. Quality Gates
- Unit tests with tmp git dirs (3 scenarios above + monorepo walk-up)

## Ambiguity Gate
🟢.
