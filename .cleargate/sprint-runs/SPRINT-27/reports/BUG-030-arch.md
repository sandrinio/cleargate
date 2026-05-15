# BUG-030 Architect Post-flight Review

**Sprint:** SPRINT-27 (Wave 1, v2 standard lane)
**Reviewer role:** architect
**Red commit:** 785ca0d
**Green commit:** c173c72
**Inner repo:** /Users/ssuladze/Documents/Dev/ClearGate/mcp on sprint/S-27

---

ARCH-PASS: APPROVED

NOTES:
All eight verification items pass cleanly against the inner mcp repo at HEAD c173c72.
(1) Schema change scope is surgically correct — only `items.updatedByMemberId` had
`.notNull()` dropped and `onDelete: 'set null'` added (schema.ts:96-97);
`item_versions.updatedByMemberId` remains `notNull()` exactly as SDR §2.5 mandated.
(2) Migration 0009_aspiring_vapor.sql is structurally sound: DROP CONSTRAINT →
ALTER COLUMN DROP NOT NULL → ADD CONSTRAINT with `ON DELETE set null ON UPDATE no action`.
The constraint name `items_updated_by_member_id_members_id_fk` is the drizzle-default
identifier, which the FLASHCARD Postgres-18 named-constraint guidance requires.
(3) 0009_snapshot.json is drizzle-kit-shaped (970 lines, full table snapshot) and
correctly reflects `notNull: false` on items.updated_by_member_id plus
`onDelete: "set null"` on its FK; item_versions copy still shows `notNull: true`.
(4) _journal.json has a single entry for tag `0009_aspiring_vapor` at idx=8 with no
orphan idx=7→8 hand-roll residue — the abandoned 0008 hand-rolled file was cleanly
discarded. The numeric gap between filename 0007 and 0009 is the drizzle-kit auto-
sequence skipping over the aborted 0008 attempt; journal idx is contiguous.
(5) The try/catch in members.ts wraps exactly `db.delete(members)` (lines 251-268),
not the resolution query or response send. 23503 maps to status 409 with body
`{error: 'member_has_dependents', code: 23503}`. Non-23503 errors re-throw. The
Red test (immutable, 298 lines, zero mocks) asserts `body.error === 'member_has_dependents'`
and is silent on a `message` field — the dispatch text's `{code, message}` shape was
a paraphrase; the Red contract is satisfied.
(6) CR-062 merge surface is pristine: the POST create-invite handler at members.ts:182-226
is unchanged, and the new try/catch lives strictly inside the DELETE handler that
opens at line 228. SDR §2.2 ordering goal achieved with zero collision risk.
(7) Type-widening in items.ts and pull-item.ts is minimal and semantics-preserving:
single-field widening from `string` to `string | null` on the `updatedByMemberId` /
`updated_by_member_id` keys of the local DTO-shape interfaces. No refactor, no
downstream consumer churn introduced. These are required propagations of the schema
nullability flip, not opportunistic edits.
(8) Red test file contains zero `t.mock` / `vi.mock` / `jest.mock` / `sinon` strings
and is byte-identical between Red (785ca0d) and Green (c173c72) commits — CR-043
immutability preserved. Scenario 3 uses a real `_bug030_fk_sentinel` scratch table
with `ON DELETE NO ACTION` to trigger an actual 23503, not a mocked error injection.

STRUCTURAL_DEBT: none

DEVIATION_VERDICTS:
  - migration-naming: ACCEPT — drizzle-kit's `0009_aspiring_vapor.sql` is the tool's
    canonical output. Forcing `0008_*` hand-roll would have required journal surgery
    and snapshot fabrication; the auto-generated path is lower risk and the numeric
    gap is documented above. QA's acceptance stands.
  - type-widening: ACCEPT — the widening in items.ts:110 and pull-item.ts:23 is the
    mechanical TypeScript consequence of the schema flip. Without it the package would
    fail typecheck post-migration. Scope is one field per file, no semantic change,
    no consumer-facing contract change (the field was always populated at write time
    pre-fix; post-fix it can legitimately be null only after a member-delete cascade).
    QA's acceptance stands.
