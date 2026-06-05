# QA Verification — STORY-047-02 (Pairing + App-Token Lifecycle)

**Verdict:** ✅ GREEN (attempt 1, no rework) · Dev commit `fb50e05`
**Method:** story-loop adversarial multi-lens (acceptance-trace · revoke-auth-security · schema-migration-noPublish), all PASS + orchestrator authoritative serial gate.

## Verified (3 lenses, static + isolated single-file runs — no concurrent full-suite)
- **All 7 §2.1 Gherkin scenarios** covered by genuine, non-vacuous tests (real Postgres18@5433 + Redis8@6380); 7/7 in isolation. No skip/only/todo; 40 assertions; Scenario 7 carries a positive control (operator MUST revoke → 204) so it can't false-green on an unmounted route.
- **One-time consume is genuinely atomic.** `UPDATE pairings SET consumed_at=NOW() WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>now() RETURNING` (`connections.ts:226-238`). Lens escalated the 2-way `Promise.all` to a **10-way burst probe** → `[200,409×9]` — exactly one winner, `consumed_at` set once. Not Fastify serialization; a true DB guard.
- **Dual authorization (operator OR minting owner) sound and DB-derived.** `authorized = projectDeletedAt===null && (row.owner===callerId || row.createdBy===callerId)` where `owner`=`projects.createdBy` via innerJoin to the credential's OWN project, `createdBy`=minting admin; `callerId`=`claims.sub` (admin role enforced). **The JWT `project_id` claim is never used for authz** → forged/mismatched project_id cannot escalate. Adversarial probes (cross-project operator, stranger consume, `createdBy=NULL` no-collision, owner-not-operator) all behave: privesc → 404, credential stays active, no rev key written.
- **Idempotent revoke** (2nd → 204 without re-write). **Rev keys inline** `rev:apptoken:<id>` / `rev:pairing:<id>` via `redis.set(key,'1','EX',revocationTtlSec(...))` — measured live TTLs sane (no-expiry → 365d default; 1h-expiry → 3599s; no EX 0 / negative / persistent). **Not** routed through `auth/revocation.ts` (correct — that store is refresh-jti-only).
- **No PUBLISH / pub-sub** in the commit (grep-clean; only deferral comments) — DoD §4.2 met, deferred to 047-04.
- **Migration `0011_free_lake` additive-only** (journal idx 11; no NOT-NULL-without-default on a 047-01 frozen column). **List DTOs metadata-only** — `toPairingDto`/`toAppTokenDto` field-pick (no `...row` spread on any path) → `codeHash`/`bcryptHash`/plaintext cannot leak; Scenario 3 asserts omission. Typecheck clean. Cleanup via `scopedCleanup` (no unconditional DELETE).

## Notes
- A lens hit a transient `app_tokens.token_id` unique collision from a **concurrent sibling-lens** run sharing the `:5433` DB (a leftover row outside the test's `scopedCleanup` scope). Self-healed on isolated re-run (7/7 ×3). Reinforces the BUG-035 §5.4 follow-up: per-process DB isolation is the only full cure for concurrent test execution. Non-blocking; verdict GREEN stands.
- Minor thinness (not a FAIL; §2.1 doesn't mandate): no explicit pairing-list `codeHash`-omission test (path provably safe via DTO field-pick); Scenario 5 mints as operator so operator/owner branches coincide there — the operator-revokes-other-owner branch proven by lens probe, not the suite.

## DoD trace
7 lifecycle tests ✓ · all Gherkin ✓ · real PG+Redis ✓ · list omits hash+plaintext ✓ · atomic one-time consume ✓ · dual-auth operator+owner, stranger rejected ✓ · idempotent revoke + rev: key ✓ · bcrypt cost-12 ✓ · no PUBLISH (grep) ✓ · additive migration ✓.
