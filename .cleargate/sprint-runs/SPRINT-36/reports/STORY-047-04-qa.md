# QA Verification — STORY-047-04 (Revocation Publish on Redis pub/sub)

**Verdict:** ✅ GREEN (attempt 1, no rework) · Dev commit `51336672`
**Method:** story-loop adversarial multi-lens (acceptance-trace · publish-ordering-failsafe · channel-grep-noSubscriber), all PASS + orchestrator authoritative serial gate.

## Resolved spec-vs-reality (orchestrator decision, executed)
Story §3.2 said "extend `revocation.ts`", but per-credential revoke actually lives inline in `connections.ts` (047-02). Implemented as dispatched: a `publishRevocation(redis,{kind,id,revokedAt})` helper in `auth/revocation.ts` (the **sole** `redis.publish` site → DoD grep holds), wired into 047-02's real app-token revoke handler. Connection/project channels (routes land in 047-03/07) are exercised via direct helper invocation against real Redis. Plan-deviation (047-04 edits `connections.ts`, 047-02's file) is acceptable — wave 2 serial, 047-02 merged.

## Verified (3 lenses, static + isolated single-file + adversarial mutation)
- **DoD grep:** `redis.publish` appears in exactly ONE src file — `auth/revocation.ts:42`. No `subscribe`/`psubscribe` added (047-06's scope). `connections.ts` calls the helper, never `redis.publish` directly.
- **Channels exact:** `rev:connection:<id>` / `rev:apptoken:<id>` / `rev:project:<id>` (mirrors `rev:token:` convention); body `{kind,id,revoked_at}` (ISO).
- **Key-before-publish ordering:** `connections.ts:392` `redis.set('rev:apptoken:'+id,'1','EX',revocationTtlSec())` awaited BEFORE `:401 publishRevocation(...)`. Lens PROBE2: 20/20 iterations a message-triggered `redis.get` found the key present; PROBE3 (inverted order) races to a missing key → property is meaningful.
- **Error not swallowed:** no try/catch around the publish; a rejecting publisher propagates (revoke never reaches its 204). Lens injected a failing-publish connection → `assert.rejects` passes; published body matches §3.3 exactly.
- **Tests genuine (real Redis subscriber, not spies):** 6 `it()` / 19 assertions; real ioredis `subscribe()` + `message` listener asserts arrival + body. **Mutation experiments** (each reverted): channel `rev:`→`WRONG:` → 5/6 time out (subscriber genuinely requires arrival); wrap publish in swallow-catch → S5 fails. No skip/only/todo.
- **No regression:** existing `rev:` key contract (value `'1'`, EX=remaining life) byte-identical; `db_write_set:[]` honored; typecheck clean; only 047-04's test file touched (no sibling tampering); EPIC-027 boundary respected.

## Noted weakness (non-fatal, logged for future hardening)
Test 4b proves key-before-publish by *simulating* the set→publish sequence in its own body rather than invoking the real DELETE handler. Production ordering (`connections.ts:392→401`, two sequential awaits) is verified by static review + the lens's external PROBE2 — but a future handler refactor could reorder without a committed test catching it. Flashcard filed. Accepted (behavior is verified now).

## DoD trace
5 real-Redis tests ✓ · all Gherkin ✓ · publish only in revocation.ts (grep) ✓ · existing rev: key contract unchanged ✓ · key-before-publish ✓ · publish-failure surfaces ✓ · no subscriber added ✓ · no DB writes ✓.
