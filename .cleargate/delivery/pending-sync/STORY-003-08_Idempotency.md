---
story_id: STORY-003-08
parent_epic_ref: EPIC-003
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:57.217Z
push_version: 2
---

# STORY-003-08: Idempotency Middleware

**Complexity:** L2.

## 1. The Spec
For `push_item`, cache `{ version, updated_at }` keyed by `idempotency:{project_id}:{idempotency_key}` in Redis with 24h TTL. Duplicate requests with the same key return the cached result without hitting the DB.

### Detailed Requirements
- Applies to `push_item` only (other tools are read or status-only)
- TTL: 24 hours
- Race safety: `SET NX` before DB write; if exists, return cached

## 2. Acceptance
```gherkin
Scenario: Duplicate push returns cached
  Given push_item with idempotency_key=K succeeded
  When same client repeats push_item with K within 24h
  Then response matches the original and no new version is written

Scenario: Different payload with same key is rejected
  Given push_item with K stored payload hash H
  When new push with K but different payload (hash H')
  Then status 409 Conflict (idempotency-key reused)
```

## 3. Implementation
- `mcp/src/middleware/idempotency.ts`

## 4. Quality Gates
- Integration: duplicate request test; conflict test

## Ambiguity Gate
🟢 — per EPIC-003 Q7 (client-provided key).
