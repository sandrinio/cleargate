# STORY-046-03 — Developer Report

role: developer · STORY=046-03 · 2026-06-04 · lane: standard · execution: wave3 adversarial workflow segment

STORY: STORY-046-03
STATUS: done
COMMIT: 8d10a26
TYPECHECK: pass
TESTS: 31 passed, 0 failed (17 new 046-03 + 14 regression from 046-02; independently re-run 3× by orchestrator, no flakes)
FILES_CHANGED:
  - broker/src/router.ts (new, +221) — prompt routing down bound line via Registry; in-flight Map<turn_id,{connection_id,app_id}>; offline fast-fail; per-connector setImmediate send-queue
  - broker/src/relay.ts (new, +175) — ordered seq event fan-out to initiating app; payload forwarded byte-for-byte (re-emits decoded envelope; NO JSON.parse/stringify of payload); close-in-flight on turn_end ONLY
  - broker/src/ws-gateway.ts (edit, +39/-1) — dispatch prompt/cancel/event/turn_end into router/relay; allowSynchronousEvents:false (race fix); 046-02 register/hello/ping/presence preserved
  - broker/test/router.node.test.ts (new) — dev verify suite
  - broker/test/router.red.node.test.ts (QA-Red, frozen)

NOTES: Edited the MERGED ws-gateway.ts (re-read from main). Opaque-relay keystone honored (relay path never parses payload — grep-clean). turn closes on turn_end exclusively (two-results-not-terminal verified). Offline fast-fail synchronous, no hang. Multiplex isolation via Map keyed by turn_id (no broadcast). route()->local stub intact. Fixed a real WS concurrency race (two same-tick app sends coalescing into one TCP data event breaking sequential receivers) with a per-connector setImmediate drain queue + allowSynchronousEvents:false. No 046-02 regression (14 registry tests pass).

KNOWN DUPLICATION (D.5): router.node.test.ts (dev verify) + router.red.node.test.ts (QA-Red) cover the same scenarios — both green; consolidation candidate.

flashcards_flagged:
  - "2026-06-04 · #connector #broker · Opaque payload pass-through = forward the SAME decoded Envelope object to encode() (one JSON.stringify on the whole frame); never touch .payload (typed `unknown` in shared/types.ts to block inspection)."
  - "2026-06-04 · #connector #broker #ws · Two concurrent same-tick app→connector WS sends can coalesce into one TCP data event, breaking sequential .once('message') receivers — fix with a per-connector setImmediate drain queue + allowSynchronousEvents:false on WebSocketServer."
  - "2026-06-04 · #test #payload-opaque · IEEE-754 sentinel (MAX_SAFE_INTEGER+1) coerces at JS assignment, so a JSON round-trip yields the same value — does NOT prove no double-encode; complement with a typeof===object payload assertion."
