# QA Verification — STORY-047-01 (Indexed Credential Schema + Verify)

**Verdict:** ✅ GREEN (after BUG-035 remediation) · merged to mcp `main` @ `5cee03b`
**Method:** adversarial multi-lens verify (story-loop workflow) → BUG-035 test-isolation remediation → orchestrator authoritative serial gate.

## Impl verified-correct (both lenses, independently)
- **Indexed O(1) verify — PROVEN, not asserted by shape alone.** `EXPLAIN ANALYZE` at 5001 seeded `app_tokens` → `Index Scan using idx_app_tokens_token_id` (Index Searches: 1), NOT a Seq Scan. The reconnect-storm / tenant-isolation fix is real. `credential-verify.ts` is a single `.where(eq(appTokens.tokenId, token_id)).limit(1)` + exactly one `bcrypt.compare`; grep-confirmed NO `for (const row of rows)` loop and NO whole-table query (the `service-token.ts:65-97` anti-pattern is not reintroduced).
- **Fail-closed + timing-flatten.** One `bcrypt.compare` on every path; FIXTURE_HASH (cost-12) compare on the no-usable-row path; `revoked_at IS NOT NULL` treated as no usable row; returns `null` fail-closed.
- **Schema/migration correct in LIVE Postgres** (`psql \d`): `app_tokens` UNIQUE INDEX `idx_app_tokens_token_id`; `pairings` partial `idx_pairings_project_active WHERE consumed_at IS NULL`; `connections.member_id` nullable; `created_by` additive on pairings+app_tokens. Migration `0010_demonic_tana_nile.sql` (journal idx 10 — correct, no 0009 collision), additive only.
- **Tests genuine, not vacuous.** Trace test spies `pg.Pool.prototype.query` (captures emitted SQL) + `bcrypt.compare` (call-count), seeds a DECOY token, asserts exactly ONE token_id-keyed SELECT (WHERE+LIMIT, zero unfiltered selects) and exactly one compare per path. No skip/only/todo. All 5 §2.1 Gherkin scenarios map 1:1 to real tests.

## The ESCALATE and its resolution
Original story-loop verdict was ESCALATED (3-attempt rework exhausted) — but NOT on impl: both lenses could not falsify the core property. The block was the DoD gate "`npm test` green for mcp/", failing on a **pre-existing, repo-wide test-isolation FK race** (Postgres 23503) that made the suite non-deterministic (~30-red at baseline `9f2204d`). Root-caused to ~20+ files doing unconditional `DELETE FROM projects`/etc. Remediated under **BUG-035** (scoped per-file fixture deletes + shared `test/support/db-fixture.ts` helper) + a follow-up (admin-users foreign-admin clear). 047-01's own tests were conformed to the new convention and the helper extended for the 3 new tables.

> **Process lesson (recorded):** the original ESCALATE was amplified by the story-loop running 3 verify lenses' full `npm test` *concurrently* against one shared Postgres — cross-process contamination manufactured 23503s on top of the real defect. `--test-concurrency=1` serializes files WITHIN a run but cannot isolate separate processes. Future stories: the orchestrator owns the authoritative full-suite gate **serially**; lenses use static + isolated-file analysis.

## Authoritative gate
Full `npm test` (525 tests, 047-01's 16 included) **5× serial, all identical: 524 pass / 0 fail / 1 skip / 0 race-23503**. (The one `23503` string per run is the intentional, passing `member-delete-fk` Scenario 3 FK-handling test.) Typecheck clean. DevOps merge diff confirmed 047-01-surface-only.

## DoD trace
revoked credential → null ✓ · indexed O(1) (EXPLAIN-proven) ✓ · bcrypt cost-12 ✓ · fail-closed ✓ · additive migration applies ✓ · UNIQUE INDEX on token_id ✓ · no whole-table scan (grep) ✓ · real Postgres-18 tests ✓ · suite deterministic green ✓.
