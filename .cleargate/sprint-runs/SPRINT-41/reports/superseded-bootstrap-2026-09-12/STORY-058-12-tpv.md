# STORY-058-12 Test Pattern Validation

role: architect

TPV: BLOCKED-WIRING-GAP — transport tests do not guarantee child-process cleanup on failure, and the fake server injects faults during initialization instead of the post-connect requests the tests exercise.

Reviewed sealed commit `a349fb1311e977af4f17a11da37cdc7c37489d13` in `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli`. All three SHA-256 values match the QA-Red report: engine `7d136d6ab4ab02d88f904db5f5d916f825e918782aff83e9922adcc4b68f54cb`; transport `ef2dd5236664457f19cc3eeddd3977deeeaa7c1fb7c99376f3b35dd315797d56`; fixture `defda83170013acc20971ac2323ad0876031fc92872b25a5b2013df518207402`.

## Required wiring repairs

1. `test/workflow/transport.red.node.test.ts:11-36` creates a client per test, then closes only after successful assertions. A failed connect/request/assertion skips cleanup; the death test has no close at all. Register `t.after(async () => client.close())` immediately after construction, before connect, or use `try/finally`. Close must be idempotent after process death and partial startup. This is the explicit TPV setup/teardown check, not an acceptance-logic judgment.
2. `test/fixtures/workflow/fake-codex.mjs:5-15` applies each fault to every inbound line. A correctly initialized client therefore gets invalid JSON, process death or RPC error on `initialize`, while the tests at `transport.red.node.test.ts:20,25,30,35` require `connect()` to succeed and only the following request to reject. Implement a minimal successful initialize/initialized handshake, ignore notifications without a response, and activate each fault only on its named business request. Use the pinned schema for a valid initialization response. The successful live probe establishes this handshake as required; do not weaken production connect to accommodate the fake.
3. The fake approval at `fake-codex.mjs:11` lacks a JSON-RPC request ID and thread identity, so it is a notification rather than a server request the client can deny. Supply the pinned request envelope and active thread/turn identity; let the fixture recognize the denial/interrupt messages rather than recursively producing another approval for them. Respect the observed active-turn notification boundary in the live probe report. This repairs protocol wiring; QA owns the exact behavioral assertions.

## Other checks

Built-in imports and the fake-process path resolve. Planned `../../src/workflow/engine.js` and `codex-transport.js` are intentional absent production modules at Red; they are not gaps. `runWave` and proposed `CodexTransport` APIs are explicitly declared in the QA report and bootstrap plan, with no existing implementation constructor to contradict them. Engine seams are plain injected objects, not mocks of nonexistent methods. Engine tests create no filesystem/process resources. Both test names match the sprint context's red-test convention.

The parent reports the stale nested npm-prefix scan was corrected and rerun with four passes. This review does not relabel the earlier failure or rerun the scan. The present TPV verdict rests on the independent cleanup/protocol wiring defects above. No full test-logic or semantic-fixture review was performed.

## Handoff

Route to QA for an explicitly authorized sealed-test amendment and replacement commit/hash, then repeat the bounded wiring check. No Developer production workaround should compensate for fixture handshake or missing cleanup. No production/test/state edits, scripts or live processes were run in this TPV dispatch. Only this report was written. Script incidents: none.

## Superseding revalidation — 2026-09-12

TPV: APPROVED

Verified actual worktree HEAD `24ebb1d8acfa0b15cd98717ff3eacc292d952820`; no tracked test modifications remain. SHA-256: engine `7d136d6ab4ab02d88f904db5f5d916f825e918782aff83e9922adcc4b68f54cb`; transport `77746ef763effcfcebd82ee5b15bef8400816fa759a6bc8afa27a513d6810da2`; fixture `723f6c991f4c24220f84993fb8595d7353bf77477f86ea1f9bf87e531292081a`. All match the updated QA report and parent-confirmed DevOps seal.

Every transport test now registers `t.after` before connect. The fake responds successfully to initialize, consumes initialized, and injects faults only for the named business request. Approval has request/thread/turn/item identity; denial replies and interrupt traffic are consumed without recursive fault injection. The previously identified wiring gaps are resolved. Engine remains unchanged; imports, proposed interfaces and naming retain the earlier valid findings. Parent reports corrected arch scan four passes, zero failures.

This supersedes the earlier BLOCKED-WIRING-GAP for this seal only. It approves wiring, not acceptance logic, runtime enforcement, implementation or story completion. No tests/source/state changes or additional runtime checks were made.
