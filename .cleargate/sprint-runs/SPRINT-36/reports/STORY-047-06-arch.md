# STORY-047-06 — Architect Post-Flight Gate

role: architect — post-flight
**Story:** STORY-047-06 Broker revoke-subscriber (PSUBSCRIBE rev:*) + kill-in-flight + whole-tenant kill
**Repo / branch:** `connector` @ `story/STORY-047-06`
**Dev commit:** `ffceed7b72006c5fe26c867183052694fe28fe2d`
**Result: PASS**

## Gate results

| Check | Verdict | Evidence |
|---|---|---|
| (1) Red tests unweakened | PASS (see caveat) | 7 `it` blocks = 7 Gherkin scenarios; 31 hard assertions; zero `.skip/.only/.todo`; zero tautologies (`assert.ok(true)` etc.). Content asserts real invariants (drop+kill+invalidate-spy+audit-shape+predicate+latency<2000ms+flush-all). |
| (2) File surface matches §3.1 | PASS | All edits on-surface: `revoke-subscriber.ts` (new), `registry.ts`, `relay.ts`, `server.ts`, the test file, `verify-client.ts` (SDR FAIL-CLOSED hook), `broker/package.json` + root `package-lock.json` (ioredis). |
| (3) No unapproved runtime dep | PASS | Sole add is `ioredis ^5.4.0` — pre-approved by SDR + sprint-context Adjacent table + flashcard `#deps`. No PM-tool SDK (grep clean). |
| (4) Cross-cutting rules honored | PASS | See per-rule below. |
| (5) EPIC-027 boundary | PASS | All edits under `connector/broker/**` + root lockfile. Nothing under `cleargate-cli/src` or `.claude/`. |

**Self-gate:** `npm run build --workspace=shared` clean → `npm run typecheck --workspace=broker` exit 0 → `npm test --workspace=broker` against real Redis @ `redis://localhost:6380`: **46/46 pass** (7 new 047-06 + full 046-03 + 047-05 regression, no regressions). No `--no-verify`. Local-only, not pushed.

## Cross-cutting rule compliance

- **#1 mcp=authority / broker verifies, never mints:** subscriber only *reacts* to `rev:*` (consumes 047-04 publish); mints nothing. Holds only its own Redis subscriber connection + the verify-client.
- **#2 indexed verify:** N/A to this story (verify is 047-05); revoke reaction calls `verifyClient.invalidate(subject)` by `connection_id`/`token_id` — targeted, no scan.
- **#3 fail-closed:** drop→kill→invalidate→audit ordering closes the race to one frame; on resubscribe the subscriber flushes the ENTIRE verify cache via `invalidate({})` so a revoke missed during a connection gap cannot survive. `rev:project` refusal stays until explicit clear (no auto-expiry). Verified by scenario 7 (green).
- **#4 Redis key shape verified:** channels match 047-04's `publishRevocation` contract exactly — `rev:connection:<id>` / `rev:apptoken:<id>` / `rev:project:<id>` / `rev:project:<id>:clear`; body `{kind,id,revoked_at}`. `parseRevokeChannel` checks the 4-part `:clear` shape before the 3-part project shape (correct precedence).
- **#5 additive migrations:** N/A — connector edge, no DB.

## SDR-mandate compliance (dispatch notes)

- ONE dedicated subscriber connection, single `new Redis()` site (revoke-subscriber.ts:307), single subscribe-mode connection separate from any request-path client (broker has no request-path Redis client at all). DoD grep PASS.
- PSUBSCRIBE `rev:*` — one pattern. The two `psubscribe()` call sites (start path L334, resubscribe path L375) both operate on the same `sub` connection; resubscribe re-issues PSUBSCRIBE idempotently, opens no second connection. Compliant with "no second subscribe on a request-path client."
- Per-subject invariant met: turn gone (`relay.forceKill`, idempotent) AND registry entry gone (`registry.drop`) AND cache invalidated (`verifyClient.invalidate`) AND audit row `{subject_kind, subject_id, project_id, turns_killed, drop_latency_ms, at}`.
- `rev:project`: iterates `registry.listAll()` by `project_id`, drops each, adds to `revokedProjects` Set, exposes `isProjectRevoked(id)` predicate (NOT wiring the gateway — correct deferral to 047-07). `:clear` removes from the Set.
- FAIL-CLOSED resubscribe flush wired via ioredis `ready` event + explicit `resubscribe()` path.
- Teardown idempotent: `forceKill` returns false on an already-removed turn; a later natural `turn_end` is a no-op — no double-teardown.
- Drop latency measured (`Date.now()-t0` into audit row); scenario 6 asserts turn gone + bounded.
- Reuse honored: imports `MemoryRegistry`, `createRelay`, `createRouter`, `createVerifyClient` — re-implements nothing. New seams added minimally and on-surface: `relay.forceKill` (terminate-not-drain, the genuine kill primitive 046-03 lacked), `registry.unbindApp` (app-token deny), `verifyClient.invalidate({})` flush-all branch.

## redTestsUnmodified caveat

Cross-repo sprint: there is **no separate QA-Red baseline commit** in the `connector` repo — the `.red.node.test.ts` file appears in exactly one commit (`ffceed7`, + one amend that touched only the commit *message* per reflog), so the QA-Red red tests and Dev impl share a single branch/commit (the established pattern for this run). I therefore could not diff against a prior QA-Red SHA. I set `redTestsUnmodified: true` on the strength of **content inspection**: the test file is unweakened, scenario-complete acceptance (7/7 Gherkin, 31 hard assertions, no skips/tautologies, real-Redis no-mocks) and its header self-documents the FROZEN-baseline TDD contract. No assertion was softened to admit the impl.

## Flashcards recorded

- `2026-06-05 · #connector #broker · 046-03 relay had no terminate-now primitive — drain-only (markCancelled keeps draining until turn_end). 047-06 revoke-kill needed relay.forceKill (mark cancelled + delete from inFlight) so the turn is GONE, not draining; idempotent so a later natural turn_end no-ops (no double-teardown). [SPRINT-36 047-06]`
- `2026-06-05 · #connector #redis · broker revoke subscriber: ONE ioredis subscribe-mode connection, PSUBSCRIBE rev:*; resubscribe re-issues PSUBSCRIBE on the SAME conn (no 2nd connection) and flushes the whole verify cache via invalidate({}) — fail-closed so a revoke missed during the gap can't survive the TTL. [SPRINT-36 047-06]`
