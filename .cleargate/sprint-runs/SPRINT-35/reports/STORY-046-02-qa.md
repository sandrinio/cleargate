# STORY-046-02 — QA-Verify Report (adversarial multi-lens)

role: qa · STORY=046-02 · 2026-06-04 · Mode: VERIFY (read-only, 3 independent lenses)

QA: PASS
ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios
MISSING: none
REGRESSIONS: none
Independently re-run by orchestrator at barrier: 14/14 pass, typecheck clean, tree clean.

## Lens 1 — Acceptance trace: PASS
All 7 §2.1 Gherkin scenarios covered 1:1 (register-assigns-id, hello-online, hello-offline-no-hang, version-mismatch-rejected, bad-credential-rejected, heartbeat-eviction, deflate-off). 14 tests green (7 red + 7 verify), ≥7 unit minimum met.

## Lens 2 — Architecture-rule compliance: PASS
perMessageDeflate strict false (ws-gateway.ts:95, confirmed via wss.options.perMessageDeflate === false). Exactly ONE setInterval (startHeartbeatSweep) — no per-socket timers anywhere in broker/src/. Registry is a proper interface (registry.ts:37-71) backed by MemoryRegistry with a plain Map; instance_id constant stub N=1. Eviction test genuinely injects sweepIntervalMs:50/staleThresholdMs:100, pauses the socket, waits 250ms real time, asserts eviction — not a trivial stub.

## Lens 3 — Auth quarantine + protocol correctness: PASS
Zero credential/secret-compare logic outside auth-stub.ts. version_mismatch is a pure integer !== on protocol_version with no payload read and does not bind the app. hello for offline/unknown target returns ready offline immediately (no hang). Bad credential creates no registry entry.

flashcards_flagged:
  - "2026-06-04 · #qa-red #connector #ws · broker test script only globs src/**; red tests in test/ dir require extending the glob — update package.json test script alongside test file commit"
  - "2026-06-04 · #test-harness · Dev verify artifact must be *.node.test.ts; *.red.node.test.ts is QA-Red-reserved even if the glob passes it to the runner"
