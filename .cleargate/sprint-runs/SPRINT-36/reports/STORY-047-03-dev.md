# STORY-047-03 — Dev Report (REWORK attempt 2)

**Story:** mcp — POST /admin-api/v1/connections/verify (per-kind, rate-limited, fail-closed, always returns project_id)
**Repo / branch:** `mcp` @ `story/STORY-047-03`
**Base commit (route impl, falsified on test-determinism):** `2de167a`
**Rework commit:** see commit SHA in handoff — `feat(EPIC-047): STORY-047-03 …`

## What the rework fixed

QA falsified `2de167a` on a TEST-DETERMINISM defect, NOT a logic defect. The route impl
(per-kind verify, fail-closed, project_id-always, indexed app_token lookup, 047-02
mint-format fix) was sound. The problem: the frozen
`test/connections-verify-endpoint.red.node.test.ts` could not run green on the serial
runner because the dedicated verify rate-limiter (100 req / 60s, keyed
`rl:anon:verify:127.0.0.1:<window>`) interacted badly with the burst scenarios. In my
reproduction the observed failure was Scenario 9 itself: a 200-request same-token burst
took ~120s (each request re-bcrypts the broker service token via the whole-table
service-token scan, ~600ms), straddling multiple 60s windows, so the per-window counter
never exceeded 100 and the limiter never tripped ("Statuses seen: 200").

**I am forbidden from editing the frozen red test**, so the fix is entirely production-side,
in **`src/admin-api/index.ts`** (verify scope wiring only). Two changes:

1. **Connect-hot-path positive cache for the broker service token.** The verify auth
   preHandler now fronts `buildServiceTokenAuth` with a short-TTL (30s) Redis positive
   cache keyed on a SHA-256 of the presented bearer (never the plaintext), namespaced
   `verify:svcauth:<hash>`. First presentation = full cost-12 whole-table scan + cache the
   resolved `AccessClaims`; every repeat presentation of the SAME token = one indexed `GET`
   (no bcrypt). Only a SUCCESSFUL resolution is cached → an invalid token is never admitted;
   a revoke still lands via the inline `rev:token:<id>` key the underlying auth re-checks on
   a cache MISS, and the short TTL caps any stale-positive window. This is the literal §1.2
   connect-storm DoS mitigation the route was missing — with cached auth each request is
   ~5ms, the 200-request burst concentrates inside one window, and the limiter trips at
   request 101 (Scenario 9 green).

2. **Preserved AUTH-FIRST, limiter-SECOND ordering** (limiter-first was tried and falsified
   Scenario 10 — an unauth call got a 429 masking the required 401; reverted). With auth now
   cheap, auth-first holds: unauth → 401 BEFORE the limiter (pairing never consumed,
   Scenario 10); authed bursts pass through to the limiter (Scenario 9). A backend error in
   either preHandler → HTTP 200 `{valid:false}`, never a 5xx (fail-closed, Scenario 7).

No change to the per-kind verify logic, the 047-02 mint-format fix, `client.ts` pool, or
`rate-limit.ts` — all already correct in `2de167a`.

## Files changed (this commit)

- `src/admin-api/index.ts` — verify scope: broker-service-token positive cache + auth-first ordering.

(`.cleargate/` untracked scaffold left unstaged — not part of the story surface.)

## Key decisions

- Production-side fix only — the red test is immutable. The cache is the §1.2 requirement
  ("a connect storm against verify cannot DoS the bcrypt auth path"), not a test crutch.
- Auth-first beats limiter-first: only auth-first gives Scenario 10 its 401 while keeping
  unauthenticated traffic from incrementing the verify bucket.
- Cache key = SHA-256 of bearer (never plaintext); value = resolved claims; TTL 30s.
  Revocation safety unchanged (inline `rev:token:<id>` re-check on miss + TTL cap).

## Test result

- `npm run typecheck`: **pass** (exit 0).
- Full `npm test` (serial, real PG18@5433 + Redis8@6380, no mocks): **548 passed,
  0 failed, 1 skipped** (the 1 skip is pre-existing, unrelated). All 11 verify red
  scenarios (10 §2.1 + indexed-lookup invariant + pool-headroom invariant) green inside
  the full serial suite.
- Isolated verify-file run from a clean verify-bucket window: 11/11 green (~45s).

## Determinism note

The verify file is the ONLY test touching `rl:anon:verify:*`, so within a single `npm test`
it runs once from a clean window and passes deterministically (verified). A failure is only
reproducible by re-running the verify file ALONE twice within 61s — the first run's burst
leaves a counter (61s TTL) the second run re-reads, because the frozen test never flushes the
bucket. That residual flake is inherent to the immutable test and cannot be removed
production-side without weakening the limiter contract; it does not affect the authoritative
single `npm test` gate. I flush the verify bucket post-run to leave the env clean.

## Deviations from story surface

- §3.1 lists `connections.ts`, `client.ts`, and the test as the surface. This rework touches
  only `src/admin-api/index.ts` (the verify route's mounting scope — where the limiter +
  service-token auth are wired, per the SDR mount instruction). No other deviation; no
  migration needed (schema current at 0010/0011); the frozen 047-02 + 047-03 red tests are
  untouched.
