# STORY-048-01 QA-Red Harness Fix Report

role: qa · STORY=048-01 · 2026-06-04

STORY: STORY-048-01
QA-RED-FIX: DONE
FIX_COMMIT: f34809a80b3e0edd6ebe0d0e5a111a5bd07c2aae
TESTS: 12 passed, 0 failed (9 red + 3 impl; full daemon suite)
SCENARIOS_PRESERVED: yes

## Fixes Applied (daemon/src/teardown.red.node.test.ts — harness only)

### Bug 1: CommonJS require() in ESM module
- Lines 58-59 (original): `require("http")` / `require("crypto")` inside `makeWsStubServer()` → `ReferenceError: require is not defined`
- Fix: Promoted to top-level `import http from "node:http"` and `import crypto from "node:crypto"`. Also added `readFileSync` to the existing `node:fs` import (removed a `require("fs")` in the PID-polling callback at original line 230).

### Bug 2: `--input-type=module <scriptFile>` rejected by Node 25
- Lines 219 and 536 (original): `spawn(process.execPath, ["--input-type=module", parentScript/signalScript], ...)` → `ERR_INPUT_TYPE_NOT_ALLOWED`
- Fix: Removed `--input-type=module` flag; script files named `.mjs` already declare ESM. No semantic change.

### Bug 3: WS stub frame builder — RFC 6455 extended length encoding
- Original frame builder comment: "no mask, len < 126 assumed for test" but the `registered` JSON payload is 144 bytes. Writing `frame[1] = 144 (0x90)` sets bit 7 (MASK flag), causing Node 25's built-in WebSocket client to reject the frame as a protocol violation → WebSocket error event → `WebSocket error dialing...`
- Fix: Added RFC 6455 branching: payloads < 126 use single-byte length; payloads 126–65535 use 2-byte extended length (`frame[1] = 126; frame.writeUInt16BE(len, 2)`). Frame content (the `registered` JSON with `server_time`) is unchanged.

## Assertions Unchanged
All 9 red test assertions are byte-identical to the frozen version. No scenario was weakened, deleted, or re-ordered.

## Suite Results
```
STORY-048-01 impl: dial / teardown / exit-handler (Node-25-safe harness)
  ✔ Scenario: Dial out and register — stores the assigned connection_id + sends metadata
  ✔ Scenario: Staged teardown leaves no orphans — parent + detached grandchild both reaped
  ✔ Scenario: Connector exit tears down all live turns — two trees fully reaped

STORY-048-01: Connector dial-out, spawn, and staged teardown
  Scenario: Dial out and register
    ✔ dials the broker, sends register with shared-secret stub, and stores the assigned connection_id
  Scenario: Spawn uses the exact verified command
    ✔ builds argv-only spawn with all four required flags and /dev/null stdin, cwd realpath-pinned
    ✔ realpath-pin rejects a cwd that is a relative path or symlink escape
  Scenario: Staged teardown leaves no orphans
    ✔ SIGTERMs, waits grace window, SIGKILLs, and reaps full descendant tree — no survivors
    ✔ emits SIGTERM before SIGKILL and respects the grace window
  Scenario: Connector exit tears down all live turns
    ✔ exit handler tears down all registered live turn process trees
  Scenario: No direct claude reference in the turn path
    ✔ turn-path source files have zero direct `claude` CLI binary references outside ClaudeBackend
    ✔ Backend interface exports `spawn(prompt, opts): ChildHandle` and a registry resolver
  §3.3 API Contract: ChildHandle shape
    ✔ buildSpawnArgs returns metadata compatible with ChildHandle contract (pid/stdout/descendants)

tests 12 | pass 12 | fail 0 | skipped 0
```

flashcards_flagged:
  - "2026-06-04 · #qa-red #test-harness · WS stub frame builder: always branch on payload length (< 126 vs 126-65535); writing frame[1]=len when len>125 sets the MASK bit (protocol violation)"
  - "2026-06-04 · #qa-red #node25 · Node 25: --input-type=module is stdin/--eval/--print only; use .mjs extension for file-based ESM spawns instead"
