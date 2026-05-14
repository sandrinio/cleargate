---
bug_id: BUG-030
parent_ref: STORY-004-03
parent_cleargate_id: STORY-004-03
sprint_cleargate_id: null
carry_over: false
area: admin-console
status: Triaged
severity: P1-High
reporter: sandro.suladze@gmail.com
approved: true
created_at: 2026-05-06T00:00:00Z
updated_at: 2026-05-06T00:00:00Z
created_at_version: post-SPRINT-26
updated_at_version: post-SPRINT-26
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: discovery-checked
      detail: expected context_source != "null", got undefined
  last_gate_check: 2026-05-05T22:14:36Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:41.084Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-030
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T22:14:36Z
  sessions: []
push_version: 1
---

# BUG-030: `DELETE /admin-api/v1/members/:mid` Returns 500 When Member Has Authored Items

## 0.5 Open Questions

- **Question:** When a member is deleted, what should happen to `items.updated_by_member_id` rows that reference them? Three options: (a) `ON DELETE SET NULL` and tolerate nullable updater (preserves item history; loses attribution); (b) `ON DELETE CASCADE` and delete the items themselves (data loss — wrong for an audit-trail surface); (c) `ON DELETE RESTRICT` and the API returns 409 Conflict with "member has authored N items, reassign or hard-delete" (forces explicit handling).
- **Recommended:** (a) `ON DELETE SET NULL`. The `items.updatedByMemberId` column already exists as a non-null FK; this requires (1) altering the column to nullable, (2) adding `ON DELETE SET NULL`, (3) the application can reconstruct authorship history from the `audit_log` table (which uses `email` denormalized at write-time, audit-stable). Member deletion in the UI is a "remove this person from the project" action, not a "redact every contribution they made" action.
- **Human decision (2026-05-06):** Accepted (a) `ON DELETE SET NULL`.

- **Question:** Is the right server-side fix only the schema migration, or also a defensive 409-mapping in the route handler so future FK violations don't bubble as 500?
- **Recommended:** Both. Add a try/catch around the `db.delete(members)` call in `members.ts:250`; map Postgres FK violation (SQLSTATE `23503`) to 409 Conflict with a structured `{ error: "member_has_dependents", ... }` payload. The schema migration is the actual fix; the mapping is defense-in-depth for any future FK that gets added without an `onDelete` clause.
- **Human decision (2026-05-06):** Accepted — both. Schema migration is the primary fix; 409-mapping is defense-in-depth.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:**
Clicking "Remove" on a pending or active member in the admin UI calls `DELETE /admin-api/v1/members/:mid`, the server cascade-deletes their tokens + invites, the member row is removed, and the UI refreshes the members list. Status: 204 No Content.

**Actual Behavior:**
The button click does nothing visible. DevTools shows the request fail with 500 Internal Server Error. The member row stays in the list. No state changes server-side. Repeated clicks all 500.

## 2. Reproduction Protocol

1. Open `https://admin.cleargate.soula.ge` and log in.
2. Navigate to a project where you (the admin) have ever pushed an item via MCP (`push_item`, `cleargate_sync_work_items`, etc.) — i.e. there are rows in `items` with `updated_by_member_id = <your-member-id>`. The dogfood project at `/projects/53a52302-9e7f-4974-b699-6039264dea48/members` is a known-positive test case (member `f22f8cc4-74ec-443e-b2db-d139bd5db4f4`).
3. Click "Remove" on that member's row.
4. Observe: button does nothing; DevTools Network tab shows `DELETE /admin-api/v1/members/<mid>` → **500 Internal Server Error**.

**Note**: this only reproduces for members who have authored items. Members who have only ever existed in `pending` state (no items pushed) will likely DELETE successfully — but the 500 is silent UI-side either way (no error toast, no rollback indicator).

## 3. Evidence & Context

User-reported network log:
```
DELETE https://cleargate-mcp.soula.ge/admin-api/v1/members/f22f8cc4-74ec-443e-b2db-d139bd5db4f4
→ 500 (Internal Server Error)

window.fetch  @  CxssgNIN.js:1
Us            @  4aqhfaRw.js:39
it            @  9.DtZhHiCV.js:1
r             @  D3652VcQ.js:1
rn            @  DgCXFE2-.js:1
```

Root cause (verified by reading source):

`mcp/src/db/schema.ts:97-98`
```ts
items.updatedByMemberId
  .notNull()
  .references(() => members.id),  // ← no `onDelete` clause; defaults to NO ACTION
```

`mcp/src/admin-api/members.ts:228-253` deletes the member row directly:
```ts
await deps.db.delete(members).where(eq(members.id, row.memberId));
return reply.code(204).send();
```

The handler comment at line 247-249 explicitly enumerates which FKs cascade (`tokens`, `invites`) — but **`items` is never mentioned**. When `items` rows reference the member, Postgres rejects the DELETE with `ERROR: update or delete on table "members" violates foreign key constraint ... on table "items"` (SQLSTATE 23503). The error is unhandled in the route, so Fastify's default error mapper turns it into a 500.

Also note: the `audit_log` table (schema.ts:168) DOES have `onDelete: 'cascade'` on its member FK, which contradicts the inline comment at line 169 ("denormalized from members.email, audit-stable") — audit rows shouldn't disappear when their author is deleted. Likely a separate latent issue; flagging here for triage but not fixing in this BUG.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `mcp/src/db/schema.ts:97-98` — change `items.updatedByMemberId` to nullable + `onDelete: 'set null'`. (Pending §0.5 Q1 confirmation.)
- `mcp/migrations/<next>.sql` — Drizzle migration: `ALTER TABLE items ALTER COLUMN updated_by_member_id DROP NOT NULL; ALTER TABLE items DROP CONSTRAINT items_updated_by_member_id_members_id_fk; ALTER TABLE items ADD CONSTRAINT items_updated_by_member_id_members_id_fk FOREIGN KEY (updated_by_member_id) REFERENCES members(id) ON DELETE SET NULL;`
- `mcp/src/admin-api/members.ts:228-253` — wrap `db.delete(members)` in a try/catch; map FK violations (PostgresError code `23503`) to `409 { error: "member_has_dependents", code: 23503 }`. Schema migration is the primary fix; this is defense-in-depth.
- `mcp/src/admin-api/members.test.ts` — new test cases per §5.
- `admin/src/lib/components/MembersList.svelte` (or wherever the "Remove" button lives) — confirm error-handling shows a toast on non-2xx; this is **out of scope for this BUG** but flag it as a follow-up CR if missing.

**Do NOT modify:**
- `audit_log` schema or its FKs (separate latent issue).
- Other FKs to `members.id` (lines 61, 71, 168 are `cascade` — leave as-is).
- The DELETE handler's project-ownership check (lines 229-245) — works correctly.

## 5. Verification Protocol (The Failing Test)

**Failing test (proves the bug):**
```sh
cd mcp && npm test -- members
```

New case in `members.test.ts`:
```ts
it('returns 204 when deleting a member who has authored items', async () => {
  const { project, member } = await seedProjectAndMember(deps);
  await deps.db.insert(items).values({
    projectId: project.id,
    cleargateId: 'TEST-001',
    type: 'epic',
    currentVersion: 1,
    currentPayload: {},
    updatedByMemberId: member.id,
  });

  const res = await app.inject({
    method: 'DELETE',
    url: `/admin-api/v1/members/${member.id}`,
    headers: { authorization: `Bearer ${adminJwt}` },
  });

  expect(res.statusCode).toBe(204);

  // Item survives, attribution nulled.
  const [item] = await deps.db.select().from(items).where(eq(items.cleargateId, 'TEST-001'));
  expect(item.updatedByMemberId).toBeNull();
});
```

(Pre-fix this test errors with 500 from the FK violation. Post-fix returns 204 with the item retained but un-attributed.)

**Defensive 409 test (proves the safety net):**
- Manually drop `ON DELETE SET NULL` from a fresh test DB; assert handler returns 409, not 500.

**Manual verification on prod:**
- After deploy: in admin UI, click Remove on the same member that triggered this report; confirm 204 + member disappears from list + their items still appear in `/projects/<id>/items` with `Updated by: —` (or equivalent null-render).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Fix.** Both §0.5 questions resolved 2026-05-06: (1) `ON DELETE SET NULL` accepted; (2) schema migration + 409 mapping accepted.

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Both §0.5 Open Questions resolved.
