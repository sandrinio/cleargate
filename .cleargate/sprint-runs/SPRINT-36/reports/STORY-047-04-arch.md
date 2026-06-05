# STORY-047-04 — Architect Post-Flight Review

role: architect (post-flight, final gate)

- **Story:** STORY-047-04 — mcp revocation publish on Redis pub/sub
- **Repo / branch:** `mcp` @ `story/STORY-047-04` (single commit since main)
- **Dev commit:** `51336672751e458ea23775bd34a3d4f07066e0c5`
- **Result:** **PASS**
- **redTestsUnmodified:** **true** (see §1)

## Gate results

### 1. Red tests byte-unchanged vs QA-Red acceptance — PASS (redTestsUnmodified = true)
This branch carries exactly one commit (`5133667`), checked out directly from `main` (reflog HEAD@{1}). The red test `test/revocation-publish.red.node.test.ts` was added (+280) in that single combined commit — the sprint flow for this run is QA-Red-authored test + TPV + Developer impl landing as one story commit, not separate red/green commits. There is therefore no prior QA-Red revision for the Dev to have weakened; the acceptance surface is intact and strong:
- All 5 §2.1 Gherkin scenarios covered (connection / apptoken / project publish; no-regression key contract + key-before-publish ordering as 2 `it`s; publish-failure surfaces).
- Real ioredis subscriber, no mocks (DoD); the ONE allowed stub is the failing-publish wrapper, error-path only.
- Assertions are full-fidelity: channel name exact, body `{kind,id,revoked_at}` with `revoked_at === revokedAt.toISOString()`, value `'1'` + positive TTL, `assert.rejects` on the error path. Nothing softened to a tautology.
- `*.red.node.test.ts` naming honors CR-043 immutability.

### 2. File surface matches §3.1 + SDR additions — PASS
Three files, all in-surface:
- `src/auth/revocation.ts` — §3.1 (modify). Adds `publishRevocation` + `RevocationKind` + `RevocationPublisher`. Does not touch the `RevocationStore` `revoked:<jti>` path.
- `src/admin-api/connections.ts` — SDR-approved addition (PLAN-DEVIATION logged in SDR; 047-02's file, merged, wave-2 serial). Wires `publishRevocation` into the app-token revoke handler.
- `test/revocation-publish.red.node.test.ts` — §3.1 (create). (Story §3.1 named `.node.test.ts`; `.red.node.test.ts` per sprint Red-test naming convention — correct.)
No off-surface edits. No `index.ts` / migration / `created_by` change needed (none applied — correct, this story writes no tables, `db_write_set: []`).

### 3. No new runtime dependency — PASS
`git diff main..HEAD -- package.json package-lock.json` is empty. `publishRevocation` uses the existing ioredis connection; the `RevocationPublisher` interface is a structural type, no import added.

### 4. Cross-Cutting Rules — PASS
- **R1 (mcp = authority):** publish is mcp-side only; no broker code touched.
- **R3 (fail-closed):** publish failure propagates (`await redis.publish` unguarded; `assert.rejects` proves it). Key-before-publish ordering enforced at `connections.ts:392→401` and asserted by Scenario 4b.
- **R4 (Redis key shape verified):** channels `rev:connection|apptoken|project:<id>` mirror the real `rev:token:<id>` convention; the existing `rev:apptoken:<id>` key contract (value `'1'`, `EX=revocationTtlSec(expiresAt)`) is unchanged.
- **R6 (EPIC-027 boundary):** all edits under `mcp/**`; no PM-tool SDK; nothing under `cleargate-cli/src` or `.claude/`.
- R2/R5 N/A (no verify path, no migration in this story).

### 5. DoD greps — PASS
- `redis.publish(` appears **only** at `src/auth/revocation.ts:42` (DoD grep satisfied).
- No `subscribe`/`psubscribe` anywhere in `src/` (047-06 owns the subscriber — correctly absent).

## Self-gate
- `npm run typecheck` — clean (tsc --noEmit, no output).
- `npm test` (serial, real Postgres 5433 + Redis 6380) — **538 tests, 537 pass, 1 skipped, 0 fail.** All 6 STORY-047-04 tests green; zero regressions.

## Notes / minor observations (non-blocking)
- The published `revoked_at` reuses the same `revokedAt` Date that stamps the `appTokens.revokedAt` DB row and the key write — published timestamp == stored timestamp. Good.
- Only the app-token revoke handler is wired (per Gherkin + SDR — pairing wiring optional, not required). `rev:connection:` and `rev:project:` channels are exercised by direct `publishRevocation` calls in tests; their route wiring lands in 047-03/07 as designed.

## Flashcards
No new card needed — the existing 2026-06-04 `#auth #redis` card (revocation split: `publishRevocation` must be *added* to revocation.ts, per-token keys written inline in handlers) already captures the gotcha and the implementation followed it exactly.
