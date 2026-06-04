# STORY-046-02 — Developer Report

role: developer · STORY=046-02 · 2026-06-04 · lane: standard · model: opus (session) · execution: wave2 adversarial workflow segment

STORY: STORY-046-02
STATUS: done
COMMIT: ebc9682 (branch tip; impl commit 7767266, qa-red d2a5fb8)
TYPECHECK: pass
TESTS: 14 passed, 0 failed (7 red + 7 dev-verify, 1:1 with the 7 Gherkin scenarios)
FILES_CHANGED:
  - broker/src/server.ts (new) — exposes gateway + registry for STORY-046-03 to attach a router to
  - broker/src/ws-gateway.ts (new) — WebSocketServer, perMessageDeflate:false, single heartbeat sweep timer, register/hello/ping handling
  - broker/src/registry.ts (new) — Registry interface + in-memory MemoryRegistry (Map keyed by connection_id), instance_id stub N=1
  - broker/src/auth-stub.ts (new) — sole credential seam (verifyCredential/verifyAppToken, CONNECTOR_SHARED_SECRET); EPIC-047 deletes wholesale
  - broker/test/registry.node.test.ts (new) — dev verify suite (7 scenarios)
  - broker/package.json — add ws + @types/ws devDeps; test glob extended to test/**

NOTES: Implemented against the frozen red suite (broker/test/registry.red.node.test.ts). One verify-driven fix cycle (qaBounces=1) resolved before final. Architecture rules honored: perMessageDeflate:false (ws-gateway.ts:95), exactly one setInterval sweep over registry.listAll() (no per-socket timers), Registry interface seam (swappable without touching the hot path), version_mismatch is a pure integer compare with no payload read, all credential logic confined to auth-stub.ts. Routing/relay/cancel deferred to STORY-046-03 (out of scope here).

KNOWN DUPLICATION (for D.5 consolidation): registry.node.test.ts (dev verify) and registry.red.node.test.ts (QA-Red) cover the same 7 scenarios. Both green; intra-story TDD duplication, not a correctness issue.

flashcards_flagged:
  - "2026-06-04 · #broker #heartbeat #architecture · Broker presence MUST use one setInterval sweep over a lastSeen/listAll() table, never per-socket timers; verify via single-setInterval grep in src."
  - "2026-06-04 · #broker #auth #quarantine · All broker credential logic stays in auth-stub.ts (verifyCredential/verifyAppToken); gateway only passes the shared-secret string and delegates — EPIC-047 deletes auth-stub.ts wholesale."
