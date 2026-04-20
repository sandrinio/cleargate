---
story_id: STORY-004-07
parent_epic_ref: EPIC-004
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, SPRINT-02 retrospective
sprint_id: SPRINT-03
shipped_commit: bda4308
completed_at: 2026-04-18T13:00:00Z
created_at: 2026-04-18T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-004-03
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:42:58.671Z
push_version: 3
---

# STORY-004-07: Retrofit Invite Storage to Postgres (Source of Truth)

**Complexity:** L2 — one migration, one handler rewrite, one test suite update. No API surface changes.

## 1. The Spec

SPRINT-02 shipped STORY-004-03 with Redis-only invite storage (`member_invite:<mid>` key, 24h TTL). For production durability, auditability, and admin-UI queryability, migrate invite state to a dedicated `invites` Postgres table. Postgres becomes the source of truth; Redis drops out of the invite flow entirely. This is a **retrofit before STORY-003-13 lands** — STORY-003-13's redemption route reads/writes the new table, so this Story must merge first.

### Why now (not post-alpha)
- Alpha has no real invites yet — migration cost is near-zero.
- EPIC-006 admin UI (SPRINT-04) will list/filter invites per project — that view needs DB anyway.
- Redis is a cache, not an identity store. Losing invite state on Redis restart/eviction is unacceptable for onboarding.
- Atomic one-time redemption is simpler in SQL (`UPDATE … WHERE consumed_at IS NULL RETURNING`) than in Redis (GETDEL or Lua).

### 1.1 Schema (new migration)

```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- this IS the opaque invite token
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

-- For "list pending invites for project P" (admin UI)
CREATE INDEX idx_invites_project_active
  ON invites(project_id)
  WHERE consumed_at IS NULL;

-- For redemption lookup (PK already covers; index here documents intent)
-- idx_invites_pkey on (id) — default
```

The `id` column doubles as the invite token. Opaque UUIDv4 (random, not v7), matches EPIC-005 §6.4 resolution.

### 1.2 Handler rewrites

**`mcp/src/admin-api/members.ts` — `POST /projects/:pid/members` (invite creation):**
- Transaction: insert `members` row (status derived from DB, not a column) + insert `invites` row with `expires_at = now() + interval '24 hours'`
- Response shape unchanged: returns invite URL containing the new `invites.id`
- Remove the Redis `SET member_invite:<mid> EX 86400` call entirely
- Remove `revokeInvite` Redis calls on `DELETE /members/:mid` — cascade from the FK handles it

**`mcp/src/admin-api/members.ts` — `GET /projects/:pid/members` (list):**
- Member status derived via `LEFT JOIN invites i ON i.member_id = m.id AND i.consumed_at IS NULL AND i.expires_at > now()`
- `status = 'pending'` when the join matches, `'active'` otherwise
- Remove the Redis `EXISTS` loop

### 1.3 Backward compatibility
None required. Alpha DB has zero real invites (SPRINT-02 smoke created test invites in Redis only — they'll naturally expire or can be flushed). Migration creates the table empty. No data migration needed.

## 2. Acceptance

```gherkin
Scenario: Invite creation persists to Postgres
  When POST /admin-api/v1/projects/:pid/members {email:"v@e.com", role:"user"}
  Then invites table has one row with expires_at ≈ now()+24h, consumed_at IS NULL
  And Redis has no member_invite:* key related to this invite

Scenario: Status=pending derives from DB, not Redis
  Given a pending invite for member M
  When GET /admin-api/v1/projects/:pid/members
  Then M's entry has status="pending"
  And Redis is not read during the request (verified via Redis command monitor or mock)

Scenario: Status flips to active after redemption
  Given member M with a pending invite
  When the invite is consumed (STORY-003-13 sets consumed_at)
  And GET /admin-api/v1/projects/:pid/members
  Then M's entry has status="active"

Scenario: Status=expired after 24h
  Given member M with an invite whose expires_at is 1s ago
  When GET /admin-api/v1/projects/:pid/members
  Then M's entry has status="expired" (NOT "pending" — LEFT JOIN filter excludes expired rows, handler maps null-join + non-null expires_at → "expired")

Scenario: DELETE /members/:mid cascades invite row
  Given member M with a pending invite
  When DELETE /admin-api/v1/members/:mid
  Then members row deleted
  And invites row(s) for M deleted via FK cascade

Scenario: No Redis dependency in invite path
  When any invite operation runs (create, list, redeem, delete)
  Then mcp.redis client sees zero invite-related commands (verified by scoped mock in integration tests)
```

## 3. Implementation

- `mcp/drizzle/<next>_invites.sql` — Drizzle migration (auto-generated from schema)
- `mcp/src/db/schema.ts` — add `invites` table definition
- `mcp/src/admin-api/members.ts` — rewrite invite create/list/delete paths to use the new table
- `mcp/src/admin-api/members.test.ts` — update existing tests; add new scenarios above
- `mcp/scripts/smoke-admin.ts` — adjust the invite assertions to read from DB shape (invite URL structure unchanged, so client code stays untouched)
- **Delete:** any `member_invite:*` Redis key writers/readers in the invite path

## 4. Quality Gates

- `npm run typecheck` clean
- `npm test` — all existing member/invite tests updated and passing; new DB-shape tests added
- Integration assertion: `redis-cli KEYS member_invite:*` returns empty after the test suite runs (no stray writes)
- Manual smoke: `npm run smoke:admin` still 22-green; invite creation → list → redemption (via STORY-003-13 after it lands) → cascade-delete roundtrip works end-to-end

## 5. Dependencies & ordering

- **Depends on:** STORY-004-03 (SPRINT-02 shipped) — this Story rewrites that one's storage layer
- **Blocks:** STORY-003-13 — the redemption route reads this table. 004-07 must merge first
- **Scheduled:** SPRINT-03 M4 (first), immediately before STORY-003-13

## 6. Open questions

None. Schema is pinned, handler behavior is specified, migration is additive (new table + drop Redis writes, no data transform).

## Ambiguity Gate

🟢 — clean retrofit, no cross-cutting redesign. The only decision point (Redis-only vs DB) was resolved 2026-04-18 in favor of DB source-of-truth.
