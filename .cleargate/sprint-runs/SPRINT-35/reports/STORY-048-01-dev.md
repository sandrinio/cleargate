# STORY-048-01 — Developer Report

role: developer · STORY=048-01 · 2026-06-04 · lane: standard · model: **opus** (human keep-whole decision) · execution: wave2 adversarial workflow segment + arch-bounce harness fix

STORY: STORY-048-01
STATUS: done
COMMIT: b975f1f (impl) + f34809a (qa-red harness fix; qa-red d2a… 7247a74)
TYPECHECK: pass (shared + broker + daemon; daemon tsc build clean)
TESTS: 12 passed, 0 failed (9 red + 3 dev-impl; independently re-run by orchestrator 3× — no flakes)
FILES_CHANGED:
  - daemon/src/backend.ts (new) — Backend interface + ClaudeBackend + createBackendRegistry (map-based resolve; sole owner of the "claude" literal)
  - daemon/src/dial.ts (new) — WS dial-out (Node built-in WebSocket, no ws dep), register w/ shared-secret stub + metadata, stores connection_id
  - daemon/src/spawn.ts (new) — argv-only spawn (shell:false), exact 4 flags, stdin ignore (=/dev/null), cwd realpathSync-pinned jail
  - daemon/src/teardown.ts (new) — staged SIGTERM→grace→SIGKILL + independent full-descendant-tree reap via native `ps -eo pid=,ppid=` walk (snapshot before signal, re-walk after grace); connector-exit handler reaps all live turns
  - daemon/src/index.ts — daemon entry: dial→register→on prompt (M0 stub: spawn + raw-forward stdout)→on cancel/disconnect/exit: teardown
  - daemon/src/teardown.red.node.test.ts (QA-Red, frozen) — 9 scenarios
  - daemon/src/teardown.impl.node.test.ts (dev) — 3 Node-25-safe impl tests proving correctness during the blocker

NOTES: Dispatched on Opus per §1.4 keep-whole decision. Implementation completed clean on first pass; the segment BLOCKED at the dev gate because 3 of 9 frozen red cases failed at HARNESS SETUP on Node 25 (require() in ESM; `node --input-type=module <scriptFile>` → ERR_INPUT_TYPE_NOT_ALLOWED; +WS-stub RFC-6455 framing bug found during fix). Dev correctly refused to edit frozen red tests and routed to QA-Red (arch_bounces=1). QA-Red fixed the harness (commit f34809a, assertions byte-identical) → 12/12 green against the unchanged impl. Backend seam built before spawn wiring; zero direct claude refs in the turn path (grep DoD); no tree-kill dep (thin native ps walker).

ADVISORIES (D.5 / next sprint, non-blocking): (a) teardown.impl.node.test.ts duplicates 3 red scenarios — consolidation candidate; (b) test files in daemon/src/ rather than §3.1's daemon/test/ — internally consistent (test script globs src/**), advisory under v1; (c) runtime version-drift guard absent — acceptable M0 defer (EPIC-048 hardening).

flashcards_flagged:
  - "2026-06-04 · #connector #daemon #teardown · Detached child (setsid, own PGID) escapes kill(-pgid) (GH#19045); snapshot full descendant tree via `ps -eo pid=,ppid=` BEFORE SIGTERM (ppid breaks on PID-1 reparent), then reap survivors — no tree-kill dep needed."
  - "2026-06-04 · #qa-red #node25 · Node 25: --input-type=module is stdin/--eval/--print only; use a .mjs file for file-based ESM spawn targets instead (ERR_INPUT_TYPE_NOT_ALLOWED otherwise)."
  - "2026-06-04 · #qa-red #test-harness #ws · Hand-rolled WS stub frame builder MUST branch on payload length (<126 vs 126-65535); writing frame[1]=len when len>125 sets the MASK bit → server-to-client protocol violation, client drops the socket."
