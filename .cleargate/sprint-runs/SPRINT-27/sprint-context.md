---
sprint_id: "SPRINT-27"
created_at: "2026-05-14T21:26:53.249Z"
last_updated: "2026-05-15T00:00:00.000Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Open MCP to any work-item type, prove it by syncing ClearGate's own sprint plans + reports to MCP, lock the codebase/PM-tool boundary, and give the admin console a copy-paste "connect an external agent" snippet that works for both HTTP and stdio (Claude Desktop) clients.

## Locked Versions

Frozen dependency versions for this sprint. Orchestrator populates from `package.json` snapshots at sprint init; Developers must not upgrade these mid-sprint without an explicit CR.

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| (add rows per workspace below) |  |

## Cross-Cutting Rules

Sprint-wide architecture rules and UI/API tokens that every story must honour. Populated from the parent Epic's `<architecture_rules>` block.

1. (rule 1)
2. (rule 2)
3. (rule 3)

## Active FLASHCARD Tags

FLASHCARD tags that appear in any story's `<agent_context>` for this sprint. Auto-populated by grepping `.cleargate/FLASHCARD.md` at sprint init. Agents: grep the flashcard file for each tag listed here before starting work.

- `#tag1` — one-line summary of the most recent card
- `#tag2` — one-line summary

## Adjacent Implementations (Reuse First)

Exported helpers and modules from already-merged stories in this sprint. The Architect updates this section after each story merges. Developers check here before writing new helpers — if the module already exists, import it; duplication is a kick-back criterion.

| Story | Module / Export | Path |
|-------|----------------|------|
| STORY-027-01 | `KNOWN_TYPES` (8-element literal incl. `'sprint'` + `'sprint_report'`), `TYPE_REGEX`, `normalizeType()` | `mcp/src/lib/payload-contract.ts` |
| STORY-027-02 | `RESERVED_PAYLOAD_KEYS`, `MAX_PAYLOAD_BYTES_DEFAULT` (`1048576`), full `class ValidationError` (`{code, message, hint}`) | `mcp/src/lib/payload-contract.ts` |
| STORY-027-03 | `ORIGIN_CLEARGATE_CLI` (`'cleargate-cli'`), `originRequiresGates(origin)` | `mcp/src/lib/payload-contract.ts` |
| STORY-027-04 | `CLEARGATE_ID_TYPE_REGEX`, `CLEARGATE_ID_NUMERIC_REGEX`, `isKnownIdFormat(id)`, `Warning` type alias | `mcp/src/lib/payload-contract.ts` |
| STORY-027-01 | `PushItemResult.stored_type: string` (returned on both insert + update branches) | `mcp/src/tools/push-item.ts` |
| STORY-027-04 | `PushItemResult.warnings: Warning[]` (returned on both insert + update branches) | `mcp/src/tools/push-item.ts` |
| STORY-027-04 | `audit_log.warning_code`, `audit_log.origin` columns (migration `mcp/migrations/0009_sad_mindworm.sql` + meta snapshot) | `mcp/src/db/schema.ts` |
| CR-065 | env-var literal `CLEARGATE_SERVICE_TOKEN` (string-matched by CR-061 stdio tab; do NOT extract to shared constant) | `cleargate-cli/src/commands/mcp-serve.ts` |
| CR-065 | `ServiceTokenFetcher` class + `TokenFetcher` interface | `cleargate-cli/src/auth/service-token-fetcher.ts`, `cleargate-cli/src/auth/refresh.ts` |
| CR-063 | Step 7.5 anchor comment `// CR-063: wiki ingest sprint report` (CR-064 inserts Step 7.4 IMMEDIATELY BEFORE this literal) | `.cleargate/scripts/close_sprint.mjs:750` + mirror at `cleargate-planning/.cleargate/scripts/close_sprint.mjs:750` |
| CR-063 | `EXCLUDED_SUFFIXES` allowlist carve-out + two-source `buildPageBody` (plan stub + delimited sprint-report block) | `cleargate-cli/src/commands/wiki-ingest.ts` |
| CR-062 | `MembersList.svelte`, `InviteUrlModal.svelte`, `IconButton.svelte` (reusable per-row UI for admin members surface) | `admin/src/lib/components/` |
| BUG-030 | `items.updatedByMemberId` `ON DELETE SET NULL` FK + DELETE handler 23503 → 409 fallback | `mcp/src/db/schema.ts`, `mcp/src/admin-api/members.ts` |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_

- 2026-05-15T00:00:00Z · M3-dispatch · Wave 3 plan authored (`plans/M3.md`); Adjacent Implementations table populated from Wave 1+2 merged surfaces per dispatch-brief requirement.
