---
story_id: "STORY-003-01"
parent_epic_ref: "EPIC-003"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L3"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-003-01: DB Schema + Drizzle Migrations

**Complexity:** L3 — cross-cutting schema, foundational for everything.

## 1. The Spec
Define Postgres schema per PROPOSAL-003 §2.7 via Drizzle ORM. Generate initial migration. Include trigger pruning `item_versions` to last 10 per `item_id`.

### Detailed Requirements
- All tables: `projects`, `admin_users`, `members`, `clients`, `tokens`, `items`, `item_versions`, `audit_log`
- UNIQUE constraints per PROPOSAL-003 (e.g., `items(project_id, cleargate_id)`)
- Indexes: `audit_log(project_id, timestamp DESC)`, `item_versions(item_id, version DESC)`
- Trigger: on INSERT into `item_versions`, delete rows where `version < MAX(version) - 10` for that `item_id`

### Out of Scope
- Seed data (see STORY-003-11)
- RLS policies (not used in v1)

## 2. Acceptance
```gherkin
Scenario: Clean migrate
  Given an empty Postgres
  When npm run db:generate && npm run db:migrate
  Then all tables exist with correct columns, FKs, indexes, unique constraints
  And the item_versions pruning trigger is installed

Scenario: Trigger prunes to 10
  Given an item with 11 item_versions rows (versions 1..11)
  When a row with version=12 is inserted
  Then version=1 is deleted (only 10 remain: versions 3..12)
```

## 3. Implementation
- `mcp/src/db/schema.ts` — Drizzle table definitions
- `mcp/drizzle.config.ts` — migration config
- `mcp/src/db/migrations/0000_init.sql` — generated, committed
- `mcp/src/db/migrations/0000_init_trigger.sql` — hand-added trigger, committed

## 4. Quality Gates
- Integration: migrate against dev Postgres; insert 12 `item_versions` rows; assert prune
- Typecheck: schema compiles

## Ambiguity Gate
🟢 — all decisions in PROPOSAL-003 §2.7 + EPIC-003 Q5/Q6.
