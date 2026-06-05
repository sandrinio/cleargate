---
sprint_id: "SPRINT-36"
status: "Shipped"
generated_at: "2026-06-05T05:10:00Z"
generated_by: "Reporter agent"
template_version: 2
---

<!-- Sprint Report v2 Template — template_version: 2 -->
<!-- Event-type vocabulary (protocol §§2–17):
     UR:review-feedback | UR:bug · CR:bug | CR:spec-clarification | CR:scope-change | CR:approach-change
     Circuit-breaker: test-pattern | spec-gap | environment · Lane-Demotion: LD -->

# SPRINT-36 Report: Connector M1 — Connection Identity & Credentials (Real Auth)

**Status:** Shipped
**Window:** 2026-06-04 to 2026-06-05 (~2 calendar days, single continuous run)
**Stories:** 7 planned / 7 shipped / 0 carried over · +1 unplanned mid-sprint item (BUG-035, Completed)

> **Goal verdict: MET.** The M0 shared-secret stub is retired across all 3 register lanes; `mcp` mints + verifies all credentials via an indexed O(1) verify; the broker verifies (never mints), holds no signing secret, and kills in-flight turns on revoke (measured); every relayed turn writes an audit row; everything fails closed when `mcp` is unreachable. All 9 DoD criteria satisfied (tie-out in §1).

> **Reporter input note:** No `.reporter-context.md` bundle was built for this sprint (prep_reporter_context.mjs Step 3.5 did not run for this cross-repo close). This report was synthesized directly from the sprint plan, the 27 per-story agent reports, BUG-035, sprint-context.md, state.json, and `git log` on both code repos — bundle slice missing, fetched from source per the cross-repo close path.

---

## §1 What Was Delivered

### User-Facing Capabilities
<!-- "User" here = the program operator / the broker edge that consumes the mcp identity API. -->
- **Real, revocable, attributable connection identity for the relay loop.** Pairing codes, member tokens, and app tokens are now minted, one-time-consumed, and revoked through a single authority (`mcp`), replacing the M0 shared secret. The loop is now a *trustable* skeleton — the gate before any remote exposure (EPIC-050) can be considered.
- **Instant revocation that kills in-flight work.** A revoked credential reaches **zero** Connectors (denied at connect) **and** a revoke terminates an already-streaming turn — proven on real Redis pub/sub with a measured drop latency, not a connect-time check alone.
- **Whole-tenant kill.** A `rev:project:<id>` publish drops every connection + in-flight turn for that project and sets a refusal flag (tenant-isolated: a sibling project is untouched); an explicit `:clear` lifts it.
- **Per-turn audit attribution.** Every relayed turn writes an audit row (`{connection_id, app_id, project_id, turn_id, ts}`), off the critical path — a throwing audit sink never blocks or delays the relay.

### Internal / Framework Improvements
- **Indexed O(1) credential verify** (`mcp/src/auth/credential-verify.ts`) — a non-secret `token_id` selector → single-row bcrypt(cost-12) compare, `EXPLAIN ANALYZE`-proven `Index Scan` at 5001 seeded tokens. Kills the whole-table bcrypt scan anti-pattern (`service-token.ts:65-97`); this is simultaneously the post-deploy reconnect-storm fix and a tenant-isolation fix.
- **Deterministic mcp test harness (BUG-035).** A pre-existing repo-wide cross-file FK test-isolation race (~20+ files doing unconditional `DELETE FROM projects`) was fixed via per-file scoped deletes + a shared `mcp/test/support/db-fixture.ts` helper (`scopedCleanup` / `uniqueAdminId` / `scopedCleanupByHandle`) + a foreign-admin clear. The mcp suite went from ~30-red non-deterministic to deterministic green (see §2 / §4).
- **Broker fail-closed verify-client + revoke-subscriber** (`connector/broker/src/auth/`) — SHA-256-keyed short-TTL positive cache, six enumerated fail-closed denial paths never cached, one dedicated `PSUBSCRIBE rev:*` connection, `relay.forceKill` terminate-not-drain primitive (new — 046-03's relay only drained).

### DoD Tie-Out (9 criteria → story)
| # | DoD criterion | Met by | Evidence |
|---|---|---|---|
| 1 | Revoked credential → 0 reach (deny at connect) | 047-03 + 047-05 | verify returns `valid:false`; broker denies; cache never poisoned |
| 2 | Revoke kills in-flight turn (measured latency) | 047-06 + 047-07 | `relay.forceKill`; drop latency into audit row; real-Redis `revoked-cannot-start` |
| 3 | Every turn attributable (audit row) | 047-07 | `recordTurnStart` once per `routePrompt`, off critical path |
| 4 | Broker holds no signing secret / no DB creds | 047-05 + 047-07 | broker verifies via HTTP-out + service token only; `auth-stub.ts` deleted |
| 5 | Indexed verify O(1), no whole-table scan | 047-01 | `EXPLAIN ANALYZE` Index Scan; grep-clean of the scan anti-pattern |
| 6 | Fail-closed when `mcp` unreachable | 047-03 + 047-05 | dead-DB/dead-Redis → `200 {valid:false}`, never 5xx / `valid:true` |
| 7 | M0 `auth-stub.ts` retired + 3 real lanes | 047-07 | `git rm auth-stub.ts`; grep-clean; pairing/member/app_token all verify |
| 8 | Real-infra deterministic tests (PG18 + Redis8) | 047-01..07 + BUG-035 | mcp 525/524/0/1 ×5 serial; broker 54/54 ×2 |
| 9 | Both repos build + typecheck clean; local-only | all | `tsc --noEmit` clean both repos; no `git push` executed |

### Carried Over
- None. All 7 stories reached Done; BUG-035 Completed.

---

## §2 Story Results + CR Change Log

> Cross-repo sprint. **mcp chain** (`sandrinio/cleargate-mcp`, local-only) tip `9f4c33a`; **connector chain** (`sandrinio/cleargate-connector`, local-only) tip `f040643`. Both merged to their own `main`, never pushed (owner releases).

### STORY-047-01: Indexed credential schema + indexed token verify
- **Status:** Completed · **Repo:** mcp · **Lane:** standard
- **Commit:** feat `8037b38` → merge `5cee03b`
- **Bounce count:** qa=0 arch=0 total=0 *(see note)*
- **Shipped:** `connections`/`pairings`/`app_tokens` Drizzle tables (migration `0010`, additive) + `verifyAppToken` O(1) primitive (single `token_id` lookup + one bcrypt compare, fail-closed, timing-flattened).
- **Verify highlight:** `EXPLAIN ANALYZE` at 5001 seeded tokens → `Index Scan using idx_app_tokens_token_id` (NOT Seq Scan) — the O(1) property is *proven*, not asserted by shape.
- **Note:** state.json records `qa_bounces=0 arch_bounces=0`, but the story-loop did emit one ESCALATE that was **not** an impl defect — both verify lenses could not falsify the core property. The block was the DoD "`npm test` green" gate failing on the pre-existing test-isolation race → routed to **BUG-035** (a first-class mid-sprint item, below), not counted as a CR:bug against this story's production code.

### STORY-047-02: Pairing-code + app-token lifecycle (mint / consume / revoke)
- **Status:** Completed · **Repo:** mcp · **Lane:** standard
- **Commit:** feat `fb50e05` → merge `5505221`
- **Bounce count:** qa=0 arch=0 total=0 (GREEN attempt 1, no rework)
- **Shipped:** admin-API routes for pairing + app-token mint/list/revoke + **atomic one-time consume** (`UPDATE … WHERE consumed_at IS NULL … RETURNING`); dual-auth revoke (operator OR minting owner); migration `0011` (additive columns only); rev keys written inline.
- **Verify highlight:** the 2-way consume race was escalated to a **10-way burst probe** → `[200, 409×9]` — exactly one winner. A true DB guard, not Fastify serialization. JWT `project_id` claim never used for authz (forged project_id cannot escalate → 404).

### STORY-047-04: Revocation publish on Redis pub/sub *(wave-2, parallel with 047-02)*
- **Status:** Completed · **Repo:** mcp · **Lane:** standard
- **Commit:** feat `5133667` → merge `a0c7f1a`
- **Bounce count:** qa=0 arch=0 total=0 (GREEN attempt 1, no rework)
- **Shipped:** `publishRevocation(redis, {kind, id, revokedAt})` — the **sole** `redis.publish` site; channels `rev:connection|apptoken|project:<id>`, body `{kind,id,revoked_at}` (ISO); **key-before-publish** ordering; publish errors propagate (not swallowed).
- **Verify highlight:** mutation experiments (channel `rev:`→`WRONG:` → 5/6 timeouts; swallow-catch wrap → fail) prove the real-Redis subscriber genuinely requires arrival.
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:spec-clarification | §3.2 said "extend `revocation.ts`"; per-credential revoke lives inline in `connections.ts` (047-02). SDR resolved: add `publishRevocation` helper + wire from `connections.ts`. Orchestrator-confirmed; wave-2 serial. | no tax (clarification, not bug) |

### STORY-047-03: `POST /connections/verify` — per-kind, fail-closed, project_id-always
- **Status:** Completed · **Repo:** mcp · **Lane:** standard
- **Commit:** feat `2de167a` → rework `d9a2cda` → merge `9f4c33a`
- **Bounce count:** qa=1 arch=0 total=1 (1 rework)
- **Shipped:** the identity chokepoint — per-kind verify dispatch (pairing PK lookup / app_token indexed `verifyAppToken` / member JWT+jti), dedicated anon rate-limiter (`rl:anon:verify:<ip>`, 100/60s), pool headroom, always returns `project_id`. SDR-1b mint-format fix: mint now emits `<selector>.<secret>`.
- **Verify highlight:** fail-closed is real — a 2nd app-instance with dead DB + dead Redis returns `200 {valid:false}` for all 3 kinds; no path emits `valid:true` or 5xx (a 5xx would be read by the broker as retry-into-open).
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | `2de167a` falsified on a **test-determinism** defect (rate-limiter burst straddled 60s windows under the slow whole-table service-token bcrypt). Fixed production-side (`d9a2cda`): short-TTL Redis positive cache for the broker service token → burst concentrates in one window, limiter trips at req 101. | qa_bounces +1 |

### STORY-047-05: Broker verify-client + fail-closed + verify cache + project_id stamp
- **Status:** Completed · **Repo:** connector/broker · **Lane:** standard
- **Commit:** feat `13a8811` → merge `fabae42`
- **Bounce count:** qa=0 arch=0 total=0 (GREEN attempt 1, no rework)
- **Shipped:** `createVerifyClient` — SHA-256-keyed in-process positive cache (raw credential never a key), `verify()` fail-closed on all 6 denial paths (unreachable / timeout / non-2xx / unparsable / `valid!==true` / `valid:true` lacking `project_id`), `invalidate(subject)` hook for 047-06, bounded 2s `AbortController` timeout. `registry.register()` fail-closes on absent `project_id`.
- **Verify highlight:** denial-never-cached proven via 2nd-presentation `requestCount` increment (a poisoned cache would short-circuit the 2nd call); `project_id` taken from response only — client-injected `connector_meta.project_id` is ignored.

### STORY-047-06: Broker revoke-subscriber — kill-in-flight + whole-tenant kill
- **Status:** Completed · **Repo:** connector/broker · **Lane:** standard
- **Commit:** feat `a4c5155` (round 1) → rework `ffceed7` → merge `1a8f91a`
- **Bounce count:** qa=1 arch=0 total=1 (1 rework)
- **Shipped:** one dedicated `PSUBSCRIBE rev:*` connection; kill-in-flight via the new `relay.forceKill` (terminate-not-drain) primitive; whole-tenant kill (tenant-isolated); audit row with measured `drop_latency_ms`; idempotent teardown; ioredis `^5.4.0` added.
- **Verify highlight:** strongest probe — primed a real positive binding via a fake mcp `/verify`, confirmed a cache hit, called `resubscribe()`, next verify **re-hit the network** → cache actually cleared (not just a hook fired).
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:bug | Round-1 `a4c5155` falsified: the resubscribe cache-flush was implemented but **inert** — `invalidate({})` had no flush-all branch in the merged 047-05 client, so a revoke missed during a connection gap survived the full TTL (the exact fail-open this story exists to close). Fixed `ffceed7`: real `cache.clear()` flush-all branch. | qa_bounces +1 |

### STORY-047-07: Wire 3 register lanes, retire auth-stub, audit per turn *(keystone)*
- **Status:** Completed · **Repo:** connector/broker · **Lane:** standard
- **Commit:** feat `184218d` → merge `f040643`
- **Bounce count:** qa=0 arch=0 total=0 (GREEN attempt 1, no rework)
- **Shipped:** all 3 register lanes verify through the real verify-client (member lane passes the `cleargate join` token as-is); **`auth-stub.ts` deleted wholesale** (grep-clean); per-turn audit (fire-and-forget); **closed the 047-06 wiring gap** (gateway + revoke-subscriber now share one registry/router/relay/verifyClient); app_id consistency (verified `token_id` overrides the spoofable payload `app_id`).
- **Verify highlight:** revoked-cannot-start proven end-to-end on **real Redis :6380** — publish `rev:connection:<id>` → real 047-06 subscriber drops the entry → fresh register re-hits mcp → `valid:false` → deny. The M0 wiring gap is closed in the production boot path.
- **CR Change Log:**
  | # | Event type | Description | Counter delta |
  |---|---|---|---|
  | 1 | CR:scope-change | Atomic with the stub deletion, **3 prior-sprint test files** (046-02/046-03, two of them `*.red.node.test.ts`) had to be rewritten to inject a real verify-client over an http stub — every behavioral assertion preserved. Explicitly authorized by §1.5 + SDR dispatch task 9. | arch_bounces +0 (authorized, not a bounce) |

### BUG-035: mcp test suite — systemic cross-file FK seed race (Postgres 23503) *(unplanned, mid-sprint)*
- **Status:** Completed · **Repo:** mcp · **Severity:** P1-High
- **Commits:** `bcf3f15` → merge `ba244fb` (scoped per-file deletes + `db-fixture.ts`); `2f3f360` → merge `f58840d` (admin-users foreign-admin clear).
- **Shipped:** see §4 narrative. Made the mcp suite deterministic (was ~30-red non-deterministic → green). Human-approved path: *"fix harness first, then continue"* (2026-06-04).

---

## §3 Execution Metrics

| Metric | Value |
|---|---|
| Stories planned | 7 |
| Stories shipped (Done) | 7 |
| Stories escalated | 0 (1 transient ESCALATE on 047-01 → resolved via BUG-035, not a final state) |
| Stories carried over | 0 |
| Unplanned mid-sprint items | 1 (BUG-035, Completed) |
| Fast-Track Ratio | 0% (all 7 standard lane — auth surface, explicitly not fast-laned per plan §113) |
| Fast-Track Demotion Rate | N/A (0 fast-lane stories) |
| Hotfix Count (sprint window) | 0 (no `wiki/topics/hotfix-ledger.md` for this cross-repo program; BUG-035 is a tracked Bug, not a hotfix) |
| Hotfix-to-Story Ratio | 0 |
| Hotfix Cap Breaches | 0 |
| LD events | 0 |
| Total QA bounces | 2 (047-03, 047-06 — one rework each) |
| Total Arch bounces | 0 |
| CR:bug events | 2 (047-03 rate-limit determinism; 047-06 inert flush-all) |
| CR:spec-clarification events | 1 (047-04 publish location) |
| CR:scope-change events | 1 (047-07 atomic prior-sprint test rewrite) |
| CR:approach-change events | 0 |
| UR:bug events | 0 |
| UR:review-feedback events | 0 |
| Circuit-breaker fires: test-pattern | 0 |
| Circuit-breaker fires: spec-gap | 0 |
| Circuit-breaker fires: environment | 0 |
| **Bug-Fix Tax** | 28.6% (2 CR:bug / 7 stories) |
| **Enhancement Tax** | 0% |
| **First-pass success rate** | 71.4% (5/7 GREEN attempt-1: 047-01*, 047-02, 047-04, 047-05, 047-07) |

\* 047-01 impl was first-pass-correct; its only rework was the BUG-035-class harness flake, not a logic defect.

### Token Reconciliation (DEGRADED — see flag)
| Source | Value |
|---|---|
| Token cost (sprint work, dev+qa+architect) | **UNAVAILABLE** — no `token-ledger.jsonl` written for SPRINT-36 |
| Token cost (Reporter analysis pass) | TBD — see token-ledger.jsonl post-dispatch |
| Token cost (sprint total) | **UNAVAILABLE** — no `.session-totals.json` for SPRINT-36 |
| Token source: story-doc-secondary | N/A — agent reports carry no `token_usage` frontmatter this run |
| Token source: task-notification-tertiary | N/A |
| Token divergence flag (>20%) | N/A — cannot compute (no ledger) |

**Ledger degraded — root cause known and pre-recorded.** `ORCHESTRATOR_PROJECT_DIR` was unset during this cross-repo run, so the SubagentStop hook mis-bucketed all per-agent cost into `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl` (last written 2026-06-04 11:25 — *before* this sprint initialized at 14:52). No SPRINT-36 ledger or session-totals file exists. This is the exact failure the FLASHCARD `#reporting #cross-repo` card (2026-06-04, from SPRINT-35) warned about: *"Cross-repo sprint … export ORCHESTRATOR_PROJECT_DIR or the SubagentStop hook mis-buckets per-agent cost to _off-sprint."* **No token numbers are fabricated.** Cost is genuinely unrecoverable for this sprint; the divergence check is moot. Tracked in §6 Tooling as Red.

---

## §4 Observe Phase Findings

### 4.1 Bugs Found (during execution)
| Date | Description | Resolution | Commit |
|---|---|---|---|
| 2026-06-04 | **BUG-035** — mcp suite non-deterministic: ~20+ test files run unconditional `DELETE FROM projects` → cross-file FK 23503 race (observed `122 → 2 → 0` fails, zero code change). Pre-existing at baseline `9f2204d` (~30-red), surfaced by 047-01's new tables + the adversarial pipeline re-running the suite concurrently. | Human chose "fix harness first." Fixed via per-file **scoped** deletes + shared `mcp/test/support/db-fixture.ts` (`scopedCleanup`/`uniqueAdminId`/`scopedCleanupByHandle`) across 38 files, + an admin-users foreign-admin clear. Result: **deterministic** — 509-green (047-less) / 525-524-0-1 (with 047-01), 5× serial identical, **0× race-23503**. No assertions weakened; test files only; typecheck clean. | `ba244fb`, `f58840d` |

### 4.2 Hotfixes Triggered
| ID | Trigger | Resolution | Commit |
|---|---|---|---|
| (none) | — | — | — |

### 4.3 Review Feedback (UR:review-feedback)
None recorded.

### Cross-process residual (open follow-up, surfaced by the adversarial pipeline)
BUG-035 fixed the **intra-run** cross-file race (`--test-concurrency=1` truly serializes files end-to-end — verified by a handle-transition probe). The residual leaks were **cross-PROCESS**: the adversarial pipeline runs multiple verify lenses, each executing the live suite against the **one shared** `:5433` DB, manufacturing 23503s + `rl:anon:verify:` bucket bleed on top of the real defect (recurred non-fatally in 047-02, 047-03, 047-05 lens runs; each self-healed on isolated re-run). The `audit.node.test.ts` `244 != 250` residual is the same class (a sibling's global `DELETE FROM audit_log` — left global because it has no inbound FK). Does **not** reproduce in clean serial runs (the authoritative gate). Root cure = **per-process DB isolation** (each concurrent `npm test` gets its own database), which also removes the orchestrator's need to serialize verify lenses. Carried forward (§5 / below).

---

## §5 Lessons

### New Flashcards (Sprint Window — 2026-06-04 / 2026-06-05)
| Date | Tags | Lesson |
|---|---|---|
| 2026-06-05 | #connector #test-harness #qa-red | Story that deletes a module + rewrites prior-sprint red tests that imported it in ONE commit: the FULL package suite IS the dangling-import detector (leftover import fails at module load → all-green ⇒ zero danglers). Don't treat authorized prior-sprint red-test edits as acceptance-weakening. [047-07] |
| 2026-06-05 | #connector #broker | 046-03 relay was drain-only; 047-06 revoke-kill needed `relay.forceKill` (mark cancelled + delete from inFlight) so the turn is GONE not draining; idempotent so a later natural turn_end no-ops. [047-06] |
| 2026-06-05 | #connector #redis | broker revoke subscriber: ONE ioredis subscribe-mode conn, `PSUBSCRIBE rev:*`; resubscribe re-issues on the SAME conn + flushes the whole verify cache via `invalidate({})` — fail-closed so a revoke missed during the gap can't survive the TTL. [047-06] |
| 2026-06-04 | #mcp #test #flaky | `GET /admin-users` returns the WHOLE table; its `=== 3` test flakes when a SEPARATE process leaves admin rows. `--test-concurrency=1` serializes files (intra-run safe) → leak is cross-PROCESS. Fix: FK-safe-clear FOREIGN admins, never weaken to `>=3`. [BUG-035] |
| 2026-06-04 | #schema #migration #mcp | `migrations/` has TWO `0009_*.sql`; next migration MUST be `0010_*`. Never trust `drizzle generate` numbering blind — grep `_journal.json` tail first. [047-01] |
| 2026-06-04 | #auth #redis | mcp revocation is SPLIT: `RevocationStore` writes only `revoked:<jti>`; per-token `rev:token:<id>` keys are inline in `tokens.ts`, NOT in `revocation.ts`. A story that says "extend revocation.ts" must ADD that path. [047-04] |
| 2026-06-04 | #connector #auth #deps | broker ships ONLY `ws`; M1 adds `ioredis ^5.4.0` for the PSUBSCRIBE subscriber (047-06); verify-client (047-05) uses Node-24 global fetch + node:crypto, no new dep. [SPRINT-36] |

### Flashcard Audit (Stale Candidates)
No stale flashcards detected. **(Audit pass not exhaustively run — Reporter scoped its grep to the active sprint window; a full repo-wide symbol grep of every unmarked card was not performed because the cross-repo bundle was absent and the symbols span two gitignored repos. Flagged for human spot-check at Gate 4.)**

### Supersede Candidates
| Newer card | Older card | Proposed marker for older |
|---|---|---|
| 2026-06-04 `#connector #auth #deps` (broker adds ioredis for the subscriber) | 2026-06-04 `#connector #broker` (SPRINT-35 046-02): "all credential logic stays in auth-stub.ts (EPIC-047 deletes it wholesale)" | `[R]` — resolved: 047-07 **did** delete `auth-stub.ts` wholesale this sprint; the "stays in auth-stub.ts" guidance is now historical. Human approves at Gate 4. |

---

## §6 Framework Self-Assessment

### Templates
| Item | Rating | Notes |
|---|---|---|
| Story template completeness | Green | §3.1 file surfaces drove the post-flight surface audit cleanly across all 7. |
| Sprint Plan Template usability | Green | Cross-cutting rules + adjacent-implementations table were load-bearing; devs cited the reuse table to avoid re-implementing primitives. |
| Sprint Report template (this one) | Yellow | v2 §3/§4 assume same-repo (hotfix-ledger, token-ledger). Cross-repo + degraded-ledger forced several N/A rows. Mirrors the standing SPRINT-35 `#reporting #cross-repo` card — the template still lacks a first-class cross-repo mode. |

### Handoffs
| Item | Rating | Notes |
|---|---|---|
| Architect → Developer brief quality | Green | SDR dispatches resolved the 047-04 publish-location and 047-03 mint-format ambiguities before code; devs followed the SDR over conflicting story prose correctly. |
| Developer → QA artifact completeness | Green | Dev reports carried red-baseline proofs (stash-verify, `ERR_MODULE_NOT_FOUND` baselines) the QA lenses could re-run. |
| QA → Orchestrator kickback clarity | Green | Both reworks (047-03, 047-06) had a precise, reproducible falsifier and a named fix-direction; rework landed in one attempt each. |

### Skills
| Item | Rating | Notes |
|---|---|---|
| Flashcard gate adherence | Green | 7 sprint-window cards recorded; the pre-existing `#auth #redis` revocation-split card was cited by 047-04 dev+arch as the gotcha they followed. |
| Adjacent-implementation reuse rate | Green | 047-03 consumed 047-01's `verifyAppToken` (no re-implement); 047-06 reused `MemoryRegistry`/`createRelay`/`createRouter`/`createVerifyClient`; 047-07 shared one set of instances. Zero duplicated primitives. |

### Process
| Item | Rating | Notes |
|---|---|---|
| Bounce cap respected | Green | Max bounces on any story = 1 (047-03, 047-06). 047-01's 3-attempt rework exhaustion was a harness flake (BUG-035), correctly re-routed rather than counted as logic failure. |
| Three-surface landing compliance | Green (cross-repo variant) | Code → mcp/connector own `main` (local-only); planning/state → meta-repo `.cleargate/`; wiki landing deferred (connector program is unapproved/separate-git per memory). |
| Circuit-breaker fires (if any) | Green | None fired. |

### Lane Audit
| Story | Files touched | LOC | Demoted? | In retrospect, was fast correct? (y/n) | Notes |
|---|---|---|---|---|---|
| (none) | — | — | — | — | All 7 standard lane by design (highest-stakes auth surface, plan §113 forbids fast-laning). No fast-lane rows. |

### Hotfix Audit
| Hotfix ID | Originating signal | Files touched | LOC | Resolved-by SHA | Could this have been a sprint story? (y/n) | If y — why was it missed at planning? |
|---|---|---|---|---|---|---|
| (none) | — | — | — | — | — | — |

### Hotfix Trend
0 hotfixes in window. The Connector program is a separate gitignored product with no `hotfix-ledger.md`; rolling 4-sprint hotfix count is not tracked for it. trend: N/A (no ledger data). BUG-035 was a tracked Bug worked through the loop, not an out-of-band hotfix.

### Tooling
| Item | Rating | Notes |
|---|---|---|
| run_script.sh diagnostic coverage | Green | Zero `## Script Incidents` across all 27 agent reports — no script failures. |
| Token ledger completeness | **Red** | No SPRINT-36 `token-ledger.jsonl` or `.session-totals.json` written. `ORCHESTRATOR_PROJECT_DIR` unset → all cost mis-bucketed to `_off-sprint` (last write 11:25, before 14:52 init). Cost unrecoverable; no fabrication. Exactly the SPRINT-35 `#reporting #cross-repo` card's failure mode — the export step needs to become a hard preflight for cross-repo runs. |
| Token divergence finding | N/A | Cannot compute — ledger absent. (Not a >20% divergence Yellow; the gap is total, attributed to the unset env, not a Reporter-pass TBD.) |

---

## §7 Change Log

| Date | Author | Change |
|---|---|---|
| 2026-06-05 | Reporter agent | Initial generation (synthesized from source artifacts; no reporter-context bundle; token ledger degraded — cost unavailable). |

---

## Carry-Forward Items (for next sprint / EPIC-047 hardening)

1. **Per-process test-DB isolation** (BUG-035 §5.4 + the `audit.node.test.ts` `244 != 250` cross-process residual). Each concurrent `npm test` should get its own database; this also removes the orchestrator's need to serialize verify lenses. Tracked the moment parallel CI / concurrent verify is introduced.
2. **Member `member_id` persistence** (047-07 accepted M1 limitation). The member lane binds `project_id` and fail-closes correctly, but `RegistryEntry` has no `member_id` column — `member_id` rides the verify response but is not persisted. Adding it is a frozen-046-02-schema change beyond M1 SDR scope. Future hardening.
3. **047-04 ordering-test hardening** (047-04 noted weakness). Test 4b proves key-before-publish by *simulating* the set→publish sequence in its own body rather than driving the real DELETE handler — production ordering is verified by static review + the lens's external PROBE2, but a future handler refactor could reorder without a committed test catching it. Flashcard filed; strengthen the test to drive the real handler.
4. **Cross-repo Reporter / ledger mode.** Make `ORCHESTRATOR_PROJECT_DIR` a hard preflight for cross-repo sprints (token ledger + Reporter bundle both assume same-repo). This sprint's cost is permanently unrecoverable as a result.
