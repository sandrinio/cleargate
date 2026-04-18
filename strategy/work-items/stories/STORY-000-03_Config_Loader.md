---
story_id: "STORY-000-03"
parent_epic_ref: "EPIC-000"
status: "Completed"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-003_MCP_Adapter.md"
sprint_id: "SPRINT-03"
shipped_commit: "acde4ba"
completed_at: "2026-04-18T00:00:00Z"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-18T18:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-000-03: Config Loader (`src/config.ts`)

**Complexity:** L1.

## 1. The Spec
Resolve effective config from (in order of precedence): CLI flags → env vars → `~/.cleargate/config.json` → defaults. Return a typed, zod-validated `Config` object with fields: `mcpUrl`, `profile`, `logLevel`.

### Detailed Requirements
- `CLEARGATE_MCP_URL` env var recognized
- `--mcp-url` and `--profile` CLI flags override env
- Missing `mcpUrl` at command-time → friendly error pointing at `cleargate join`

## 2. Acceptance
```gherkin
Scenario: Precedence honored
  Given env CLEARGATE_MCP_URL=https://env.example
  And config.json has mcpUrl=https://file.example
  When cleargate is invoked with --mcp-url=https://flag.example
  Then effective mcpUrl=https://flag.example

Scenario: Missing mcpUrl surfaces helpful error
  Given no env, no flag, no config file
  When a command that requires mcpUrl is invoked
  Then exit 1 with "Run `cleargate join` first" message
```

## 3. Implementation
- `cleargate-cli/src/config.ts` — zod schema, loader, merge logic

## 4. Quality Gates
- Unit tests on precedence, error messages, schema validation

## Ambiguity Gate
🟢 — per EPIC-000 Q4 resolution.
